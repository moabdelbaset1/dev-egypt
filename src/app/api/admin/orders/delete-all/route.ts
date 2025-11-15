import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/appwrite-admin"
import { DATABASE_ID, ORDERS_COLLECTION_ID } from "@/constants/appwrite"

export async function DELETE(request: NextRequest) {
  try {
    const { databases } = await createAdminClient()

    // Get all orders
    const { documents: orders } = await databases.listDocuments(
      DATABASE_ID,
      ORDERS_COLLECTION_ID,
      []
    )

    // Delete all orders
    const deletePromises = orders.map(order =>
      databases.deleteDocument(DATABASE_ID, ORDERS_COLLECTION_ID, order.$id)
    )

    await Promise.all(deletePromises)

    return NextResponse.json({
      success: true,
      deleted: orders.length,
      message: `Successfully deleted ${orders.length} orders`
    })

  } catch (error: any) {
    console.error("Error deleting all orders:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete orders" },
      { status: 500 }
    )
  }
}
