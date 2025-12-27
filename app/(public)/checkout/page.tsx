'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface SelectedTickets {
  eventId: string;
  tickets: Array<{
    type: string;
    quantity: number;
  }>;
  totalAmount: number;
}

interface CheckoutForm {
  name: string;
  email: string;
  phone: string;
  agreeToTerms: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [selectedTickets, setSelectedTickets] = useState<SelectedTickets | null>(null);
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<CheckoutForm>({
    name: '',
    email: '',
    phone: '',
    agreeToTerms: false,
  });

  useEffect(() => {
    // Get selected tickets from localStorage
    const stored = localStorage.getItem('selectedTickets');
    if (!stored) {
      router.push('/events');
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      setSelectedTickets(parsed);

      // Fetch event details
      fetchEvent(parsed.eventId);
    } catch (err) {
      console.error('Error parsing selected tickets:', err);
      router.push('/events');
    }
  }, [router]);

  const fetchEvent = async (eventId: string) => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      const data = await response.json();

      if (data.success) {
        setEvent(data.data);
      } else {
        setError('Failed to load event details');
      }
    } catch (err) {
      setError('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setError('');

    if (!formData.agreeToTerms) {
      setError('Please agree to the terms and conditions');
      setProcessing(false);
      return;
    }

    try {
      // Create guest account if not logged in
      const guestResponse = await fetch('/api/auth/guest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        }),
      });

      const guestData = await guestResponse.json();

      if (!guestData.success) {
        setError(guestData.error || 'Failed to create guest account');
        setProcessing(false);
        return;
      }

      // Store guest token (you might want to use NextAuth here instead)
      localStorage.setItem('guestToken', guestData.data.token);

      // Reserve tickets
      const reservePromises = selectedTickets!.tickets.map(async (ticket) => {
        for (let i = 0; i < ticket.quantity; i++) {
          const response = await fetch('/api/tickets', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${guestData.data.token}`,
            },
            body: JSON.stringify({
              eventId: selectedTickets!.eventId,
              ticketType: ticket.type,
              quantity: 1, // Reserve one at a time
            }),
          });

          const data = await response.json();
          if (!data.success) {
            throw new Error(data.error || 'Failed to reserve ticket');
          }
          return data.data.reservationId;
        }
      });

      const reservationIds = await Promise.all(reservePromises.flat());

      // Redirect to payment with reservation info
      router.push(`/payment?reservationId=${reservationIds[0]}&guestToken=${guestData.data.token}`);

    } catch (err: any) {
      setError(err.message || 'Failed to process checkout');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading checkout...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedTickets || !event) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-gray-600">No tickets selected. <Link href="/events" className="text-blue-600">Browse events</Link></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Checkout</h1>
          <p className="mt-2 text-gray-600">Complete your ticket purchase</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h2>

            <div className="mb-4">
              <h3 className="font-medium text-gray-900">{event.title}</h3>
              <p className="text-sm text-gray-600">
                {new Date(event.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              <p className="text-sm text-gray-600">{event.venue.name}, {event.venue.city}</p>
            </div>

            <div className="space-y-3">
              {selectedTickets.tickets.map((ticket, index) => {
                const ticketType = event.ticketTypes.find((t: any) => t.name === ticket.type);
                return (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <span className="font-medium">{ticket.quantity}x {ticket.type}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        (KSH {ticketType?.price.toLocaleString()})
                      </span>
                    </div>
                    <span className="font-medium">
                      KSH {(ticketType?.price * ticket.quantity).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span>Total</span>
                <span>KSH {selectedTickets.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Guest Information Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Guest Information</h2>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+254712345678"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="agreeToTerms"
                    name="agreeToTerms"
                    type="checkbox"
                    required
                    checked={formData.agreeToTerms}
                    onChange={handleInputChange}
                    className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="agreeToTerms" className="text-gray-700">
                    I agree to the{' '}
                    <Link href="#" className="text-blue-600 hover:text-blue-500">
                      terms and conditions
                    </Link>{' '}
                    and{' '}
                    <Link href="#" className="text-blue-600 hover:text-blue-500">
                      privacy policy
                    </Link>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={processing}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {processing ? 'Processing...' : 'Continue to Payment'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
