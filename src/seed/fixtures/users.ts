export const optionalUserFixtures = [
  {
    emailEnv: 'SEED_ADMIN_EMAIL',
    firstName: 'System',
    lastName: 'Administrator',
    passwordEnv: 'SEED_ADMIN_PASSWORD',
    roleSlug: 'admin',
  },
  {
    emailEnv: 'SEED_CONTENT_MANAGER_EMAIL',
    firstName: 'Content',
    lastName: 'Manager',
    passwordEnv: 'SEED_CONTENT_MANAGER_PASSWORD',
    roleSlug: 'content_manager',
  },
  {
    collegeSlugEnv: 'SEED_COORDINATOR_COLLEGE_SLUG',
    emailEnv: 'SEED_COORDINATOR_EMAIL',
    firstName: 'Medicine',
    lastName: 'Coordinator',
    passwordEnv: 'SEED_COORDINATOR_PASSWORD',
    roleSlug: 'coordinator',
  },
  {
    emailEnv: 'SEED_STUDENT_EMAIL',
    firstName: 'Demo',
    lastName: 'Student',
    passwordEnv: 'SEED_STUDENT_PASSWORD',
    roleSlug: 'student',
  },
  {
    emailEnv: 'SEED_DOCTOR_EMAIL',
    firstName: 'Demo',
    lastName: 'Doctor',
    passwordEnv: 'SEED_DOCTOR_PASSWORD',
    roleSlug: 'doctor',
  },
] as const
