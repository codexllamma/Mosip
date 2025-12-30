# match_by_city.py
import functools
import math
from typing import List, Optional, Tuple, Dict, Any

from prisma import Prisma
from geopy.geocoders import Nominatim
from geopy.distance import geodesic

# --- geocoder + cache (synchronous geopy used inside async code, that's fine) ---
geolocator = Nominatim(user_agent="exporter-qa-matcher")

def pin_to_lat_lon(pincode):
    geolocator = Nominatim(user_agent="my_python_app_name")
    location = geolocator.geocode({'postalcode': pincode, 'country': 'India'})
    if location:
        return location.latitude, location.longitude
    return None, None

@functools.lru_cache(maxsize=2048)

def distance_km_from_coords(a: Tuple[float, float], b: Tuple[float, float]) -> float:
    return geodesic(a, b).km

def availability_score(current: int, capacity: int) -> float:
    if capacity <= 0:
        return 0.0
    r = current / capacity
    r = max(0.0, min(1.0, r))
    return 1.0 - r

def normalize(values: List[float]) -> List[float]:
    if not values:
        return []
    mn = min(values)
    mx = max(values)
    if mx == mn:
        return [0.5] * len(values)
    return [(v - mn) / (mx - mn) for v in values]

# ---------------------------
# MAIN ASYNC MATCH FUNCTION
# ---------------------------
async def match_exporter_using_city(
    db: Prisma,
    pincode: int, # The Batch/Submission Pincode
    test_to_be_done: list,
    *,
    distance_weight: float = 0.7,
    availability_weight: float = 0.3,
    top_k: int = 5,
) -> Dict[str, Any]:
    
    # 1. Geocode the origin (Batch location)
    origin_lat, origin_lng = pin_to_lat_lon(pincode)
    if origin_lat is None:
        print(f"Error: Could not geocode origin pincode {pincode}")
        return {"best": None, "candidates": [], "all_scored": []}

    # 2. Fetch Active QAs
    qa_profiles = await db.qaprofile.find_many(
        where={"active": True},
        include={"user": True}
    )
    
    # Filter by required tests
    qa_profiles = [p for p in qa_profiles if set(test_to_be_done).issubset(set(p.testsAvailable))]

    if not qa_profiles:
        return {"best": None, "candidates": [], "all_scored": []}

    # 3. Compute raw metrics
    raw_entries = []
    
    for p in qa_profiles:
        # Get QA Coordinates (DB first, then Geocoder)
        if hasattr(p, 'latitude') and p.latitude and p.longitude:
            qa_coords = (p.latitude, p.longitude)
        else:
            # FIX: Use the QA's pincode, NOT the submission pincode!
            # Ensure your schema field name matches: p.pinCode or p.pincode
            qa_pin = getattr(p, 'pinCode', getattr(p, 'pincode', None))
            qa_coords = pin_to_lat_lon(qa_pin)
            
            if qa_coords[0] is not None:
                await db.qaprofile.update(
                    where={"id": p.id},
                    data={"latitude": qa_coords[0], "longitude": qa_coords[1]}
                )

        # Calculate Distance
        dist_km = float('inf')
        if qa_coords[0] is not None:
            dist_km = distance_km_from_coords((origin_lat, origin_lng), qa_coords)

        # Calculate Availability
        raw_avail = availability_score(
            getattr(p, "currentLoad", 0), 
            getattr(p, "maxCapacity", 1)
        )

        raw_entries.append({
            "profile": p,
            "distance_km": dist_km,
            "raw_avail": raw_avail
        })

    # 4. Filter out any that couldn't be geocoded if necessary, or handle 'inf'
    finite_distances = [e["distance_km"] for e in raw_entries if math.isfinite(e["distance_km"])]
    max_dist = max(finite_distances) * 2 if finite_distances else 1000.0

    # 5. Normalize and Score
    dist_list = [e["distance_km"] if math.isfinite(e["distance_km"]) else max_dist for e in raw_entries]
    avail_list = [e["raw_avail"] for e in raw_entries]
    
    d_norm = normalize(dist_list)
    a_norm = normalize(avail_list)

    scored = []
    for i, entry in enumerate(raw_entries):
        # score: lower is better
        score = (distance_weight * d_norm[i]) + (availability_weight * (1.0 - a_norm[i]))
        
        scored.append({
            "qa_profile_id": entry["profile"].id,
            "qa_name": entry["profile"].user.name if entry["profile"].user else "Unknown",
            "distance_km": entry["distance_km"] if math.isfinite(entry["distance_km"]) else None,
            "raw_availability": entry["raw_avail"],
            "score": round(score, 4)
        })

    scored.sort(key=lambda x: x["score"])

    return {
        "best": scored[0] if scored else None,
        "candidates": scored[:top_k],
        "all_scored": scored
    }