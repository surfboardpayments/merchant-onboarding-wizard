import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const postcode = request.nextUrl.searchParams.get("postcode");

  if (!postcode) {
    return NextResponse.json(
      { error: "Postcode is required" },
      { status: 400 }
    );
  }

  const cleaned = postcode.replace(/\s/g, "").toUpperCase();

  try {
    // Use postcodes.io - free, no API key needed
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(cleaned)}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Postcode not found" },
          { status: 404 }
        );
      }
      throw new Error(`Postcodes.io error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.result;

    // Return a simplified address structure
    const address = {
      postcode: result.postcode,
      locality: result.admin_ward || "",
      region: result.region || result.european_electoral_region || "",
      country: result.country || "England",
      // For full address lookup, we'd need a paid service like Ideal Postcodes
      // postcodes.io gives us the area but not individual addresses
      latitude: result.latitude,
      longitude: result.longitude,
      adminDistrict: result.admin_district,
    };

    return NextResponse.json({ address });
  } catch (error) {
    console.error("Postcode lookup error:", error);
    return NextResponse.json(
      { error: "Failed to lookup postcode" },
      { status: 500 }
    );
  }
}
