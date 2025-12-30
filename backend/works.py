import os
from dotenv import load_dotenv
from prisma import Prisma

# Load variables from .env into the system environment
load_dotenv()

db = Prisma()
from match import match_exporter_using_city

async def main():
    # 1. Initialize and Connect
    await db.connect()
    
    # 2. Your manual test input
    test_pincode = 400091
    test_list = ["moisture", "heavyMetals"]
    
    # 3. Call the function
    results = await match_exporter_using_city(db, test_pincode, test_list)
    print(results)
    
    # 4. Disconnect
    await db.disconnect()

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())