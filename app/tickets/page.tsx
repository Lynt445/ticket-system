'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Ticket {
  _id: string;
  ticketType: string;
  price: number;
  status: string;
  qrCode: string;
  eventId: {
    title: string;
    date: string;
    venue: {
      name: string;
      city: string;
    };
  };
  createdAt: string;
}

export default function TicketsPage() {
  const { data: session, status } = useSession();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'authenticated') {
      fetchTickets();
    } else if (status === 'unauthenticated') {
      // Check for guest token
      const guestToken = localStorage.getItem('guestToken');
      if (guestToken) {
        fetchTickets(guestToken);
      } else {
        setLoading(false);
      }
    }
  }, [status]);

  const fetchTickets = async (guestToken?: string) => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (guestToken) {
        headers['Authorization'] = `Bearer ${guestToken}`;
      }

      const response = await fetch('/api/tickets/my-tickets', {
        headers,
      });

      const data = await response.json();

      if (data.success) {
        setTickets(data.data);
      } else {
        setError(data.error || 'Failed to load tickets');
      }
    } catch (err) {
      setError('Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${ticketId.slice(-8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download ticket');
      }
    } catch (error) {
      alert('Failed to download ticket');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your tickets...</p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' && !localStorage.getItem('guestToken')) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">My Tickets</h1>
            <p className="text-gray-600 mb-6">Please sign in to view your tickets</p>
            <div className="space-x-4">
              <Link
                href="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
          <p className="mt-2 text-gray-600">View and manage your ticket purchases</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {tickets.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets</h3>
            <p className="mt-1 text-sm text-gray-500">You haven't purchased any tickets yet.</p>
            <div className="mt-6">
              <Link
                href="/events"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Browse Events
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tickets.map((ticket) => (
              <div key={ticket._id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {ticket.eventId.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {new Date(ticket.eventId.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-gray-500 mb-3">
                        {ticket.eventId.venue.name}, {ticket.eventId.venue.city}
                      </p>
                    </div>
                    <div className="ml-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        ticket.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : ticket.status === 'used'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">Ticket Type:</span>
                      <span className="font-medium">{ticket.ticketType}</span>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-gray-600">Price:</span>
                      <span className="font-medium">KSH {ticket.price.toLocaleString()}</span>
                    </div>

                    <div className="space-y-2">
                      <button
                        onClick={() => handleDownload(ticket._id)}
                        className="w-full flex justify-center py-2 px-4 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50"
                      >
                        Download PDF
                      </button>

                      {ticket.status === 'active' && (
                        <div className="space-y-2">
                          <button className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                            Transfer Ticket
                          </button>
                          <button className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                            List for Resale
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-gray-500 text-center">
                    Purchased {new Date(ticket.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/events"
              className="flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse More Events
            </Link>
            <Link
              href="/transfers"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Transfer History
            </Link>
            <Link
              href="/marketplace"
              className="flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Browse Marketplace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
