'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Event {
  _id: string;
  title: string;
  description?: string;
  date: string;
  venue: {
    name: string;
    address: string;
    city: string;
    coordinates?: [number, number];
  };
  images: string[];
  ticketTypes: Array<{
    name: string;
    price: number;
    capacity: number;
    sold: number;
    available: number;
    description?: string;
  }>;
  managerId: {
    name: string;
  };
  allowTransfers: boolean;
  allowResale: boolean;
  termsAndConditions?: string;
  totalSold: number;
  totalAvailable: number;
  totalCapacity: number;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});

  useEffect(() => {
    if (params.id) {
      fetchEvent();
    }
  }, [params.id]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${params.id}`);
      const data = await response.json();

      if (data.success) {
        setEvent(data.data);
      } else {
        setError(data.error || 'Failed to load event');
      }
    } catch (err) {
      setError('Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleTicketQuantityChange = (ticketType: string, quantity: number) => {
    setSelectedTickets(prev => ({
      ...prev,
      [ticketType]: Math.max(0, quantity)
    }));
  };

  const getTotalAmount = () => {
    if (!event) return 0;
    return Object.entries(selectedTickets).reduce((total, [typeName, quantity]) => {
      const ticketType = event.ticketTypes.find(t => t.name === typeName);
      return total + (ticketType?.price || 0) * quantity;
    }, 0);
  };

  const getTotalTickets = () => {
    return Object.values(selectedTickets).reduce((sum, qty) => sum + qty, 0);
  };

  const handlePurchase = () => {
    const ticketsToPurchase = Object.entries(selectedTickets)
      .filter(([_, quantity]) => quantity > 0)
      .map(([type, quantity]) => ({ type, quantity }));

    if (ticketsToPurchase.length === 0) {
      alert('Please select at least one ticket');
      return;
    }

    // Store selection in localStorage and redirect to checkout
    localStorage.setItem('selectedTickets', JSON.stringify({
      eventId: params.id,
      tickets: ticketsToPurchase,
      totalAmount: getTotalAmount()
    }));

    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading event details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-red-600">{error || 'Event not found'}</div>
            <Link href="/events" className="mt-4 inline-block text-blue-600 hover:text-blue-800">
              ← Back to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <Link href="/events" className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Events
        </Link>

        {/* Event Images */}
        {event.images && event.images.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {event.images.map((image, index) => (
                <div key={index} className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                  <Image
                    src={image}
                    alt={`${event.title} - Image ${index + 1}`}
                    width={600}
                    height={300}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Event Details */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{event.title}</h1>

          {event.description && (
            <p className="text-gray-600 mb-6 text-lg">{event.description}</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Event Details</h3>
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {new Date(event.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>

                <div className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <div className="font-medium">{event.venue.name}</div>
                    <div className="text-sm">{event.venue.address}, {event.venue.city}</div>
                  </div>
                </div>

                <div className="flex items-center text-gray-600">
                  <svg className="w-5 h-5 mr-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Organized by {event.managerId.name}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Ticket Availability</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Capacity:</span>
                  <span className="font-medium">{event.totalCapacity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tickets Sold:</span>
                  <span className="font-medium text-green-600">{event.totalSold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Available:</span>
                  <span className="font-medium text-blue-600">{event.totalAvailable}</span>
                </div>
              </div>

              {event.allowTransfers && (
                <div className="mt-4 p-3 bg-green-50 rounded-md">
                  <div className="flex items-center text-green-800">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Ticket transfers allowed
                  </div>
                </div>
              )}

              {event.allowResale && (
                <div className="mt-2 p-3 bg-blue-50 rounded-md">
                  <div className="flex items-center text-blue-800">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    Ticket resale allowed
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Ticket Selection */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Select Tickets</h2>

          <div className="space-y-4">
            {event.ticketTypes.map((ticketType) => (
              <div key={ticketType.name} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{ticketType.name}</h3>
                    {ticketType.description && (
                      <p className="text-gray-600 text-sm">{ticketType.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      KSH {ticketType.price.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">
                      {ticketType.available} available
                    </div>
                  </div>
                </div>

                {ticketType.available > 0 ? (
                  <div className="flex items-center space-x-4">
                    <label className="text-gray-700">Quantity:</label>
                    <input
                      type="number"
                      min="0"
                      max={ticketType.available}
                      value={selectedTickets[ticketType.name] || 0}
                      onChange={(e) => handleTicketQuantityChange(ticketType.name, parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div className="text-red-600 font-medium">Sold Out</div>
                )}
              </div>
            ))}
          </div>

          {/* Order Summary */}
          {getTotalTickets() > 0 && (
            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2">
                {Object.entries(selectedTickets)
                  .filter(([_, quantity]) => quantity > 0)
                  .map(([typeName, quantity]) => {
                    const ticketType = event.ticketTypes.find(t => t.name === typeName);
                    return (
                      <div key={typeName} className="flex justify-between text-gray-600">
                        <span>{quantity}x {typeName}</span>
                        <span>KSH {(ticketType?.price || 0) * quantity}</span>
                      </div>
                    );
                  })}
                <div className="border-t pt-2 mt-4">
                  <div className="flex justify-between text-lg font-semibold text-gray-900">
                    <span>Total: {getTotalTickets()} ticket{getTotalTickets() !== 1 ? 's' : ''}</span>
                    <span>KSH {getTotalAmount().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePurchase}
                className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Proceed to Checkout
              </button>
            </div>
          )}
        </div>

        {/* Terms and Conditions */}
        {event.termsAndConditions && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Terms and Conditions</h2>
            <div className="prose max-w-none text-gray-600">
              {event.termsAndConditions.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
