'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'pending' | 'completed' | 'failed'>('loading');
  const [message, setMessage] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const reservationId = searchParams.get('reservationId');
  const guestToken = searchParams.get('guestToken');

  useEffect(() => {
    if (!reservationId) {
      router.push('/events');
      return;
    }

    // Simulate payment initiation (in real app, this would happen on the checkout page)
    initiatePayment();
  }, [reservationId, router]);

  const initiatePayment = async () => {
    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': guestToken ? `Bearer ${guestToken}` : '',
        },
        body: JSON.stringify({
          reservationId,
          phoneNumber: '+254712345678', // In real app, get from form
        }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('pending');
        setTransactionId(data.data.transactionId);
        setMessage('STK Push sent to your phone. Please enter your PIN to complete payment.');

        // Start polling for payment status
        pollPaymentStatus(data.data.checkoutRequestID);
      } else {
        setStatus('failed');
        setMessage(data.error || 'Payment initiation failed');
      }
    } catch (error) {
      setStatus('failed');
      setMessage('Failed to initiate payment');
    }
  };

  const pollPaymentStatus = async (checkoutRequestID: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/payments/status/${checkoutRequestID}`);
        const data = await response.json();

        if (data.success) {
          if (data.data.status === 'completed') {
            setStatus('completed');
            setMessage('Payment successful! Your tickets have been booked.');
            clearInterval(pollInterval);

            // Clear localStorage and redirect
            localStorage.removeItem('selectedTickets');
            setTimeout(() => {
              router.push('/tickets');
            }, 3000);
          } else if (data.data.status === 'failed') {
            setStatus('failed');
            setMessage('Payment failed. Please try again.');
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Error polling payment status:', error);
      }
    }, 5000); // Poll every 5 seconds

    // Stop polling after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (status === 'pending') {
        setStatus('failed');
        setMessage('Payment timeout. Please try again.');
      }
    }, 300000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {status === 'loading' && (
              <>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
                  Initiating Payment
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  Please wait while we set up your payment...
                </p>
              </>
            )}

            {status === 'pending' && (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
                  Payment Pending
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  {message}
                </p>
                <div className="mt-4 text-center">
                  <div className="animate-pulse text-sm text-gray-500">
                    Checking payment status...
                  </div>
                </div>
              </>
            )}

            {status === 'completed' && (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
                  Payment Successful!
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  {message}
                </p>
                <div className="mt-6">
                  <Link
                    href="/tickets"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    View My Tickets
                  </Link>
                </div>
              </>
            )}

            {status === 'failed' && (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="mt-6 text-center text-2xl font-extrabold text-gray-900">
                  Payment Failed
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                  {message}
                </p>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                  <Link
                    href="/events"
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Back to Events
                  </Link>
                </div>
              </>
            )}
          </div>

          {transactionId && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Transaction ID: {transactionId}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
