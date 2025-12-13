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
        pincode=400092
    )
    print(result)
    return result
