'use client'

import { useState } from 'react'
import CampaignTab from '@/components/CampaignTab'
import CampaignQueueTab from '@/components/CampaignQueueTab'
import CampaignReportsTab from '@/components/CampaignReportsTab'

type Tab = 'queue' | 'send' | 'reports'

export default function CampaignsClient() {
  const [tab, setTab] = useState<Tab>('queue')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campaigns</h1>
        <p className="text-sm text-slate-500 mt-0.5">Send outreach and see who opened it.</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit mb-6">
        <TabButton active={tab === 'queue'} onClick={() => setTab('queue')}>Queue</TabButton>
        <TabButton active={tab === 'send'} onClick={() => setTab('send')}>Send</TabButton>
        <TabButton active={tab === 'reports'} onClick={() => setTab('reports')}>Reports</TabButton>
      </div>

      {tab === 'queue' && <CampaignQueueTab />}
      {tab === 'send' && <CampaignTab />}
      {tab === 'reports' && <CampaignReportsTab />}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}
