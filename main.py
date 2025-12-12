# main.py
from fastapi import FastAPI
from prisma import Prisma
from match import match_exporter_using_city

app = FastAPI()
db = Prisma()

@app.on_event("startup")
async def startup():
    await db.connect()

@app.on_event("shutdown")
async def shutdown():
    await db.disconnect()

@app.post("/match")
async def match_endpoint():
    result = await match_exporter_using_city(
        db=db,
        exporter_address="Andheri East, Mumbai",
        exporter_city="Mumbai",
        exporter_lat=19.0760,
        exporter_lng=72.8777
    )
    return result
