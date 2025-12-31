'use server'

import { matchExporterUsingCity } from '@/lib/matchingService'; // Import the function we made before

export async function findBestMatchAction(pincode: string, tests: string[]) {
  try {
    // Basic validation
    if (!pincode || tests.length === 0) {
      return { success: false, error: "Pincode and Tests are required" };
    }

    // Call the heavy logic we wrote in the service file
    const result = await matchExporterUsingCity(pincode, tests);

    // Return simple JSON data to the client
    return { success: true, data: result };

  } catch (error) {
    console.error("Match Action Error:", error);
    return { success: false, error: "Failed to perform matching" };
  }
}