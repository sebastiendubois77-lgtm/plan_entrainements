'use client';
import React from 'react';

export default function AthleteList({ athletes = [], onRefresh }: { athletes: any[]; onRefresh?: () => void }) {
  return (
    <ul>
      {athletes.length === 0 && <li>Aucun athlète</li>}
      {athletes.map(a => (
        <li key={a.id} className="py-2 border-b">
          <div className="flex justify-between">
            <div>
              <div className="font-semibold">{a.name}</div>
              <div className="text-sm text-gray-500">{a.sport}</div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}