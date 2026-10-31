// src/context/ShipmentInspectionContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

interface ShipmentInspectionContextType {
  isOpen: boolean;
  selectedShipmentId: string | null;
  openInspection: (shipmentId: string) => void;
  closeInspection: () => void;
}

const ShipmentInspectionContext = createContext<ShipmentInspectionContextType | undefined>(undefined);

export const ShipmentInspectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);

  const openInspection = useCallback((shipmentId: string) => {
    setSelectedShipmentId(shipmentId);
    setIsOpen(true);
  }, []);

  const closeInspection = useCallback(() => {
    setIsOpen(false);
    setSelectedShipmentId(null);
  }, []);

  return (
    <ShipmentInspectionContext.Provider
      value={{
        isOpen,
        selectedShipmentId,
        openInspection,
        closeInspection,
      }}
    >
      {children}
    </ShipmentInspectionContext.Provider>
  );
};

export const useShipmentInspection = (): ShipmentInspectionContextType => {
  const context = useContext(ShipmentInspectionContext);
  if (!context) {
    throw new Error('useShipmentInspection must be used within a ShipmentInspectionProvider');
  }
  return context;
};

export default ShipmentInspectionContext;
