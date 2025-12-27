import mongoose from 'mongoose';
import { MarketplaceListing, Ticket, Event, Transaction } from '@/lib/db/models';

// List ticket for resale
export async function listTicketForSale(
  ticketId: string,
  sellerId: string,
  listingPrice: number
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get ticket and verify ownership
    const ticket = await Ticket.findById(ticketId).populate('eventId').session(session);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.userId.toString() !== sellerId) {
      throw new Error('You do not own this ticket');
    }

    if (ticket.status !== 'active') {
      throw new Error('Ticket is not available for resale');
    }

    // Check if resale is allowed for this event
    const event = ticket.eventId as any;
    if (!event.allowResale) {
      throw new Error('Resale is not allowed for this event');
    }

    // Check price constraints
    if (listingPrice > ticket.price * 2) {
      throw new Error('Listing price cannot exceed 200% of original price');
    }

    if (event.maxResalePrice && listingPrice > event.maxResalePrice) {
      throw new Error(`Maximum resale price is ${event.maxResalePrice}`);
    }

    // Create marketplace listing
    const listing = await MarketplaceListing.create([{
      ticketId,
      eventId: ticket.eventId,
      sellerId,
      originalPrice: ticket.price,
      listingPrice,
      status: 'active',
    }], { session });

    // Update ticket status
    ticket.status = 'listed';
    await ticket.save({ session });

    await session.commitTransaction();

    return {
      success: true,
      listingId: listing[0]._id,
      message: 'Ticket listed for sale successfully',
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Get marketplace listings
export async function getMarketplaceListings(filters: {
  eventId?: string;
  minPrice?: number;
  maxPrice?: number;
  ticketType?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const query: any = { status: 'active' };

    if (filters.eventId) {
      query.eventId = filters.eventId;
    }

    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      query.listingPrice = {};
      if (filters.minPrice !== undefined) query.listingPrice.$gte = filters.minPrice;
      if (filters.maxPrice !== undefined) query.listingPrice.$lte = filters.maxPrice;
    }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const listings = await MarketplaceListing.find(query)
      .populate({
        path: 'ticketId',
        match: filters.ticketType ? { ticketType: filters.ticketType } : {},
        populate: {
          path: 'eventId',
          select: 'title date venue images'
        }
      })
      .populate('sellerId', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Filter out listings where ticketId is null (due to match condition)
    const validListings = listings.filter(listing => listing.ticketId);

    const total = await MarketplaceListing.countDocuments(query);

    return {
      success: true,
      listings: validListings,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw error;
  }
}

// Purchase ticket from marketplace
export async function purchaseFromMarketplace(
  listingId: string,
  buyerId: string,
  paymentData: any
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get listing
    const listing = await MarketplaceListing.findById(listingId)
      .populate('ticketId')
      .populate('eventId')
      .session(session);

    if (!listing || listing.status !== 'active') {
      throw new Error('Listing not found or not available');
    }

    const ticket = listing.ticketId as any;
    const event = listing.eventId as any;

    // Verify ticket is still available
    if (ticket.status !== 'listed') {
      throw new Error('Ticket is no longer available');
    }

    // Calculate platform commission (5%)
    const platformCommission = Math.round(listing.listingPrice * 0.05);
    const sellerAmount = listing.listingPrice - platformCommission;

    // Create transaction record
    const transaction = await Transaction.create([{
      ticketId: ticket._id,
      eventId: ticket.eventId,
      userId: buyerId,
      amount: listing.listingPrice,
      commission: platformCommission,
      status: 'completed',
      mpesaReceiptNumber: paymentData.mpesaReceiptNumber,
      mpesaPhone: paymentData.phoneNumber,
      transactionType: 'resale',
    }], { session });

    // Update ticket ownership
    ticket.userId = buyerId;
    ticket.price = listing.listingPrice; // Update to resale price
    ticket.status = 'active';
    ticket.transferCount += 1;
    ticket.scannedAt = undefined; // Reset scan status

    await ticket.save({ session });

    // Update listing
    listing.status = 'sold';
    listing.soldAt = new Date();
    await listing.save({ session });

    await session.commitTransaction();

    return {
      success: true,
      ticketId: ticket._id,
      transactionId: transaction[0]._id,
      sellerAmount,
      platformCommission,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Cancel marketplace listing
export async function cancelMarketplaceListing(
  listingId: string,
  sellerId: string
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Get listing
    const listing = await MarketplaceListing.findById(listingId).session(session);
    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.sellerId.toString() !== sellerId) {
      throw new Error('You do not own this listing');
    }

    if (listing.status !== 'active') {
      throw new Error('Listing is not active');
    }

    // Update listing status
    listing.status = 'cancelled';
    await listing.save({ session });

    // Update ticket status back to active
    const ticket = await Ticket.findById(listing.ticketId).session(session);
    if (ticket) {
      ticket.status = 'active';
      await ticket.save({ session });
    }

    await session.commitTransaction();

    return {
      success: true,
      message: 'Listing cancelled successfully',
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

// Get user's marketplace listings
export async function getUserListings(userId: string, status?: string) {
  try {
    const query: any = { sellerId: userId };
    if (status) {
      query.status = status;
    }

    const listings = await MarketplaceListing.find(query)
      .populate({
        path: 'ticketId',
        populate: {
          path: 'eventId',
          select: 'title date venue'
        }
      })
      .sort({ createdAt: -1 });

    return {
      success: true,
      listings,
    };
  } catch (error) {
    throw error;
  }
}


