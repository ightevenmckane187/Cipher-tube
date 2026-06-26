import React from 'react';
import Header from '../../components/Header';
import AgentRegistry from '../../components/AgentRegistry';
import HilQueue from '../../components/HilQueue';
import InsightsPanel from '../../components/InsightsPanel';
import LiveTrace from '../../components/LiveTrace';
import TicketPipeline from '../../components/TicketPipeline';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section>
              <h2 className="text-xl font-bold mb-4">Workforce Coordination</h2>
              <TicketPipeline />
            </section>
            <section>
              <h2 className="text-xl font-bold mb-4">Operational Observability</h2>
              <LiveTrace />
            </section>
          </div>
          <div className="space-y-6">
            <section>
              <h2 className="text-xl font-bold mb-4">System Governance</h2>
              <HilQueue />
            </section>
            <section>
              <h2 className="text-xl font-bold mb-4">Autonomous Intelligence</h2>
              <AgentRegistry />
              <div className="mt-6">
                <InsightsPanel />
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
