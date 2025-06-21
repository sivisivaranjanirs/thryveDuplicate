/*
  # Remove Appointments System

  1. Tables to Remove
    - `appointments` table
    - `doctors` table

  2. Changes
    - Drop appointments table and all related constraints
    - Drop doctors table
    - Clean up any related indexes and policies
*/

-- Drop appointments table (this will cascade and remove related constraints)
DROP TABLE IF EXISTS appointments CASCADE;

-- Drop doctors table
DROP TABLE IF EXISTS doctors CASCADE;