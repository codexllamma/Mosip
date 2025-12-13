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
async def test_details():
    tes = await db.batch.find_many(
        where={
            "staus": ['PENDING', 'IN_PROGRESS']
        },
        include={"User": True},
        order= {
            "updatedAt": 'desc'
        },
        take=1
    )
    batch = tes[0]
    pincode = batch.pinCode
    test = batch.tests
    return pincode,test

@app.post("/match")
async def match_endpoint():
    pincode, tests = await test_details()
    
    result = await match_exporter_using_city(
        db,
        pincode,
        tests
    )
    return result
