-- Set existing technicians to APPROVED status (they were already active/verified before onboarding was added)
UPDATE "TechnicianProfile" SET "onboardingStatus" = 'APPROVED' WHERE "onboardingStatus" = 'WIZARD_PENDING';
