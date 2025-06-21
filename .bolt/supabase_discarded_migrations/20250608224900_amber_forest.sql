/*
  # Add Sample Doctors

  1. New Data
    - Add sample doctors to the doctors table for testing and demo purposes
    - Includes various specialties and contact information
  
  2. Security
    - No changes to existing RLS policies
*/

-- Insert sample doctors
INSERT INTO public.doctors (
  name,
  specialty,
  email,
  phone,
  location,
  available_days,
  available_hours
) VALUES 
(
  'Dr. Sarah Johnson',
  'Cardiology',
  'sarah.johnson@healthcenter.com',
  '(555) 123-4567',
  'Downtown Medical Center, Suite 301',
  ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  '9:00 AM - 5:00 PM'
),
(
  'Dr. Michael Chen',
  'Internal Medicine',
  'michael.chen@healthcenter.com',
  '(555) 234-5678',
  'Downtown Medical Center, Suite 205',
  ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  '8:00 AM - 6:00 PM'
),
(
  'Dr. Emily Rodriguez',
  'Dermatology',
  'emily.rodriguez@healthcenter.com',
  '(555) 345-6789',
  'Westside Clinic, Floor 2',
  ARRAY['tuesday', 'wednesday', 'thursday', 'friday'],
  '10:00 AM - 4:00 PM'
),
(
  'Dr. David Kim',
  'Orthopedics',
  'david.kim@healthcenter.com',
  '(555) 456-7890',
  'Sports Medicine Center',
  ARRAY['monday', 'wednesday', 'friday'],
  '7:00 AM - 3:00 PM'
),
(
  'Dr. Lisa Thompson',
  'Psychiatry',
  'lisa.thompson@healthcenter.com',
  '(555) 567-8901',
  'Mental Health Pavilion, Suite 101',
  ARRAY['monday', 'tuesday', 'thursday', 'friday'],
  '9:00 AM - 5:00 PM'
),
(
  'Dr. Robert Wilson',
  'Neurology',
  'robert.wilson@healthcenter.com',
  '(555) 678-9012',
  'Neurological Institute, 3rd Floor',
  ARRAY['tuesday', 'wednesday', 'thursday'],
  '8:00 AM - 4:00 PM'
),
(
  'Dr. Amanda Foster',
  'Endocrinology',
  'amanda.foster@healthcenter.com',
  '(555) 789-0123',
  'Diabetes & Hormone Center',
  ARRAY['monday', 'tuesday', 'wednesday', 'friday'],
  '9:00 AM - 5:00 PM'
),
(
  'Dr. James Martinez',
  'Gastroenterology',
  'james.martinez@healthcenter.com',
  '(555) 890-1234',
  'Digestive Health Center, Suite 150',
  ARRAY['monday', 'wednesday', 'thursday', 'friday'],
  '8:30 AM - 4:30 PM'
);