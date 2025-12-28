# main.py
from fastapi import FastAPI, HTTPException
from prisma import Prisma
from prisma.enums import BatchStatus  # <--- Import your Enum
from match import match_exporter_using_city  # Uncomment this when your match file is ready

app = FastAPI()
db = Prisma()

@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()

async def test_details():
    # Find the most recently updated batch that needs attention
    batches = await db.batch.find_many(
        where={
            "status": {
                "in": [BatchStatus.PENDING, BatchStatus.IN_PROGRESS]
            }
        },
        order={
            "updatedAt": 'desc'
        },
        take=1
    )

    # Safety check: If no batches exist, return None or defaults
    if not batches:
        return None, []

    

    # Access fields matching your schema (pinCode is Int, tests is List[str])
    pincode = batches[0].pinCode
    test_list = batches[0].tests
    
    return pincode, test_list

@app.post("/match")
async def match_endpoint():
    pincode, tests = await test_details()
    
    if pincode is None:
        raise HTTPException(status_code=404, detail="No pending batches found to match.")

    # Assuming match_exporter_using_city is defined elsewhere
    result = await match_exporter_using_city(db, pincode, tests)
    
    return result
    # For now, returning the fetched data to verify it works