'use client';

import React from 'react';
import { Modal } from '../ui/Modal';
import { TradeForm } from '../dashboard/TradeForm';

interface TradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticker: string;
}

export function TradeModal({ isOpen, onClose, ticker }: TradeModalProps) {
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Trade ${ticker.toUpperCase()}`}
    >
      <div className="space-y-4">
        <p className="text-sm text-paper-muted">
          Enter the quantity and price to execute your paper trade.
        </p>
        <TradeForm 
          initialTicker={ticker} 
          lockTicker={true} 
          hideHeader={true} 
          onSuccess={onClose}
        />
      </div>
    </Modal>
  );
}
