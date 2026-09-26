-- Create restaurant staff management tables
CREATE TABLE IF NOT EXISTS restaurant_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'manager', 'staff', 'viewer')),
  permissions JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
  invited_by UUID REFERENCES restaurant_staff(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, user_email)
);

-- Create restaurant staff invitations table
CREATE TABLE IF NOT EXISTS restaurant_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  permissions JSONB DEFAULT '{}',
  invited_by UUID NOT NULL REFERENCES restaurant_staff(id),
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(restaurant_id, email)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_restaurant_id ON restaurant_staff(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_email ON restaurant_staff(user_email);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_role ON restaurant_staff(role);
CREATE INDEX IF NOT EXISTS idx_restaurant_invitations_token ON restaurant_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_restaurant_invitations_email ON restaurant_invitations(email);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_restaurant_staff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_restaurant_staff_updated_at
  BEFORE UPDATE ON restaurant_staff
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_staff_updated_at();

-- Insert sample staff data for existing restaurants
INSERT INTO restaurant_staff (restaurant_id, user_email, user_name, role, status, accepted_at)
SELECT 
  r.id,
  'owner@' || LOWER(REPLACE(r.name, ' ', '')) || '.com',
  'Restaurant Owner',
  'owner',
  'active',
  NOW()
FROM restaurants r
WHERE NOT EXISTS (
  SELECT 1 FROM restaurant_staff rs WHERE rs.restaurant_id = r.id AND rs.role = 'owner'
);

-- Add some sample staff members
INSERT INTO restaurant_staff (restaurant_id, user_email, user_name, role, status, permissions, accepted_at)
VALUES 
  (
    (SELECT id FROM restaurants WHERE name ILIKE '%típico%' LIMIT 1),
    'manager@tipico.com',
    'Carlos Manager',
    'manager',
    'active',
    '{"menu": true, "reviews": true, "analytics": true}',
    NOW()
  ),
  (
    (SELECT id FROM restaurants WHERE name ILIKE '%pizza%' LIMIT 1),
    'staff@pizza.com',
    'Maria Staff',
    'staff',
    'active',
    '{"menu": true, "reviews": false, "analytics": false}',
    NOW()
  );

COMMENT ON TABLE restaurant_staff IS 'Restaurant staff members with roles and permissions';
COMMENT ON TABLE restaurant_invitations IS 'Pending invitations for restaurant staff';
COMMENT ON COLUMN restaurant_staff.role IS 'Staff role: owner, manager, staff, viewer';
COMMENT ON COLUMN restaurant_staff.permissions IS 'JSON object with specific permissions for each area';
COMMENT ON COLUMN restaurant_staff.status IS 'Staff status: pending, active, suspended';
