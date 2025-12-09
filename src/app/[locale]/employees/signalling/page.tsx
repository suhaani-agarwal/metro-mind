"use client";

import React from "react";
import DepartmentInvalidCertificatesPage from "../DepartmentInvalidCertificatesPage";

export default function SignallingEmployeePage() {
  return (
    <DepartmentInvalidCertificatesPage
      departmentKey="signalling"
      title="Signalling Employee Dashboard"
      description="View and renew invalid signalling fitness certificates across all trains."
      accentFrom="#a855f7"
      accentTo="#ec4899"
    />
  );
}
