#!/usr/bin/env python3
"""
Initialize the alerts database with sample data.
Run this script to populate the alerts collection with demo alerts.
"""

import asyncio
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import uuid

# Load environment variables
load_dotenv()

# Database connection
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']

# Sample alerts data
SAMPLE_ALERTS = [
    {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow() - timedelta(hours=6, minutes=30),
        "event_name": "Simulation Started",
        "event_description": "CFD Simulation launched successfully by operator",
        "classification": "General Info",
        "is_new": False,
        "email_sent": False
    },
    {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow() - timedelta(hours=5, minutes=45),
        "event_name": "Furnace Deviation",
        "event_description": "Reactor Furnace 2 Temp +7% deviation from setpoint (target: 850°C, actual: 909°C)",
        "classification": "Warning",
        "is_new": True,
        "email_sent": False
    },
    {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow() - timedelta(hours=5, minutes=0),
        "event_name": "Pressure High",
        "event_description": "Reactor Pressure exceeded 10 bar - immediate attention required (current: 11.2 bar)",
        "classification": "Critical Alert",
        "is_new": True,
        "email_sent": True
    },
    {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow() - timedelta(hours=4, minutes=40),
        "event_name": "Flowmeter Reading",
        "event_description": "H₂ Outlet Flowrate updated to 1205 ml/min (within normal range)",
        "classification": "General Info",
        "is_new": False,
        "email_sent": False
    },
    {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow() - timedelta(hours=4, minutes=15),
        "event_name": "Safety Check",
        "event_description": "TI200 Average Furnace Temp > 1250°C - safety protocols activated automatically",
        "classification": "Critical Alert",
        "is_new": True,
        "email_sent": True
    },
    {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow() - timedelta(hours=3, minutes=45),
        "event_name": "MFC Switch",
        "event_description": "MFC101 switched from Air to N₂ flow as per scheduled maintenance protocol",
        "classification": "General Info",
        "is_new": False,
        "email_sent": False
    },
    {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow() - timedelta(hours=3, minutes=30),
        "event_name": "Outlet Deviation",
        "event_description": "CH₄ outlet flowrate below expected range (target: 800-900 ml/min, actual: 735 ml/min)",
        "classification": "Warning",
        "is_new": True,
        "email_sent": False
    },
    {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow() - timedelta(hours=3, minutes=15),
        "event_name": "Process Update",
        "event_description": "Reactor bed temperature stabilized at 850°C after adjustment",
        "classification": "General Info",
        "is_new": False,
        "email_sent": False
    },
    {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow() - timedelta(hours=2, minutes=30),
        "event_name": "Pressure Relief",
        "event_description": "Automated pressure relief valve activated - system pressure normalized",
        "classification": "Warning",
        "is_new": True,
        "email_sent": False
    },
    {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow() - timedelta(hours=1, minutes=45),
        "event_name": "Temperature Spike",
        "event_description": "Reactor Furnace 1 temperature spike detected: 950°C (limit: 900°C) - monitoring closely",
        "classification": "Critical Alert",
        "is_new": True,
        "email_sent": True
    },
    {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow() - timedelta(minutes=30),
        "event_name": "Flow Stabilized",
        "event_description": "All inlet flowrates have stabilized within target ranges",
        "classification": "General Info",
        "is_new": False,
        "email_sent": False
    },
    {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow() - timedelta(minutes=15),
        "event_name": "System Backup",
        "event_description": "Scheduled system backup completed successfully - all data archived",
        "classification": "General Info",
        "is_new": False,
        "email_sent": False
    }
]

async def init_alerts_database():
    """Initialize the alerts database with sample data"""
    try:
        # Connect to MongoDB
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        print("Connected to MongoDB...")
        
        # Clear existing alerts (optional - uncomment if you want to reset)
        # await db.alerts.delete_many({})
        # print("Cleared existing alerts...")
        
        # Check if alerts already exist
        existing_count = await db.alerts.count_documents({})
        print(f"Found {existing_count} existing alerts...")
        
        if existing_count == 0:
            # Insert sample alerts
            result = await db.alerts.insert_many(SAMPLE_ALERTS)
            print(f"Inserted {len(result.inserted_ids)} sample alerts successfully!")
            
            # Print summary
            counts = {
                "Total": len(SAMPLE_ALERTS),
                "General Info": len([a for a in SAMPLE_ALERTS if a["classification"] == "General Info"]),
                "Warning": len([a for a in SAMPLE_ALERTS if a["classification"] == "Warning"]),
                "Critical Alert": len([a for a in SAMPLE_ALERTS if a["classification"] == "Critical Alert"]),
                "New": len([a for a in SAMPLE_ALERTS if a["is_new"]]),
                "Email Sent": len([a for a in SAMPLE_ALERTS if a["email_sent"]])
            }
            
            print("\nAlert Summary:")
            for category, count in counts.items():
                print(f"  {category}: {count}")
                
        else:
            print("Alerts already exist in the database. Skipping initialization.")
            print("To reset alerts, uncomment the delete line in the script.")
        
        # Close connection
        client.close()
        print("\nDatabase initialization completed!")
        
    except Exception as e:
        print(f"Error initializing alerts database: {e}")
        raise e

if __name__ == "__main__":
    print("Initializing DMR Alerts Database...")
    print("=" * 50)
    asyncio.run(init_alerts_database())