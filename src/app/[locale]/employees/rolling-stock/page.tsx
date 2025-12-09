"use client";

import React from "react";
import DepartmentInvalidCertificatesPage from "../DepartmentInvalidCertificatesPage";

export default function RollingStockEmployeePage() {
  return (
    <DepartmentInvalidCertificatesPage
      departmentKey="rolling_stock"
      title="Rolling Stock Employee Dashboard"
      description="View and renew invalid rolling stock fitness certificates across all trains."
      accentFrom="#38bdf8"
      accentTo="#06d6a0"
    />
  );
}
