"use client";

import React from "react";
import DepartmentInvalidCertificatesPage from "../DepartmentInvalidCertificatesPage";

export default function TelecomEmployeePage() {
  return (
    <DepartmentInvalidCertificatesPage
      departmentKey="telecom"
      title="Telecom Employee Dashboard"
      description="View and renew invalid telecom fitness certificates across all trains."
      accentFrom="#facc15"
      accentTo="#f97316"
    />
  );
}
