"use client";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect, useRef, useState } from "react";

export default function Scanner() {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState("");

  useEffect(() => {
    if (scannerRef.current) {
      const scanner = new Html5QrcodeScanner("scanner", {
        fps: 10,
        qrbox: 250,
      });
      scanner.render(
        (decodedText) => {
          validateTicket(decodedText);
          scanner.clear();
        },
        (error) => {}
      );
    }
  }, []);

  async function validateTicket(qrData: string) {
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qrData,
        scannerId: "user-id",
        eventId: "event-id",
      }),
    });
    const data = await response.json();
    setResult(data.valid ? "Valid!" : `Invalid: ${data.reason}`);
  }

  return (
    <div className="p-8">
      <div ref={scannerRef} id="scanner" className="w-96 h-96 mx-auto" />
      {result && <p className="mt-4 text-center">{result}</p>}
    </div>
  );
}
