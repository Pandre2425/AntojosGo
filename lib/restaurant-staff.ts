import { supabase } from "./supabase/client"

export interface RestaurantStaff {
  id: string
  restaurant_id: string
  user_email: string
  user_name: string
  role: "owner" | "manager" | "staff" | "viewer"
  permissions: Record<string, boolean>
  status: "pending" | "active" | "suspended"
  invited_by?: string
  invited_at: string
  accepted_at?: string
  last_login?: string
  created_at: string
  updated_at: string
}

export interface RestaurantInvitation {
  id: string
  restaurant_id: string
  email: string
  role: string
  permissions: Record<string, boolean>
  invited_by: string
  invitation_token: string
  expires_at: string
  accepted_at?: string
  created_at: string
}

export interface StaffPermissions {
  profile: boolean
  menu: boolean
  reviews: boolean
  analytics: boolean
  staff: boolean
}

export const DEFAULT_PERMISSIONS: Record<string, StaffPermissions> = {
  owner: {
    profile: true,
    menu: true,
    reviews: true,
    analytics: true,
    staff: true,
  },
  manager: {
    profile: true,
    menu: true,
    reviews: true,
    analytics: true,
    staff: false,
  },
  staff: {
    profile: false,
    menu: true,
    reviews: true,
    analytics: false,
    staff: false,
  },
  viewer: {
    profile: false,
    menu: false,
    reviews: true,
    analytics: true,
    staff: false,
  },
}

export async function getRestaurantStaff(restaurantId: string): Promise<RestaurantStaff[]> {
  if (!supabase) {
    console.error("Supabase client not available")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("restaurant_staff")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching restaurant staff:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getRestaurantStaff:", error)
    return []
  }
}

export async function inviteStaffMember(
  restaurantId: string,
  email: string,
  role: string,
  permissions: StaffPermissions,
  invitedBy: string,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Database not available" }
  }

  try {
    // Generate invitation token
    const invitationToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    const { error } = await supabase.from("restaurant_invitations").insert({
      restaurant_id: restaurantId,
      email,
      role,
      permissions,
      invited_by: invitedBy,
      invitation_token: invitationToken,
      expires_at: expiresAt.toISOString(),
    })

    if (error) {
      console.error("Error creating invitation:", error)
      return { success: false, error: error.message }
    }

    // In a real app, you would send an email with the invitation link
    console.log(`Invitation sent to ${email} with token: ${invitationToken}`)

    return { success: true }
  } catch (error: any) {
    console.error("Error in inviteStaffMember:", error)
    return { success: false, error: error.message }
  }
}

export async function updateStaffMember(
  staffId: string,
  updates: Partial<Pick<RestaurantStaff, "role" | "permissions" | "status">>,
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Database not available" }
  }

  try {
    const { error } = await supabase.from("restaurant_staff").update(updates).eq("id", staffId)

    if (error) {
      console.error("Error updating staff member:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error in updateStaffMember:", error)
    return { success: false, error: error.message }
  }
}

export async function removeStaffMember(staffId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: "Database not available" }
  }

  try {
    const { error } = await supabase.from("restaurant_staff").delete().eq("id", staffId)

    if (error) {
      console.error("Error removing staff member:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error in removeStaffMember:", error)
    return { success: false, error: error.message }
  }
}

export async function getPendingInvitations(restaurantId: string): Promise<RestaurantInvitation[]> {
  if (!supabase) {
    console.error("Supabase client not available")
    return []
  }

  try {
    const { data, error } = await supabase
      .from("restaurant_invitations")
      .select("*")
      .eq("restaurant_id", restaurantId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching pending invitations:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in getPendingInvitations:", error)
    return []
  }
}

export function hasPermission(staff: RestaurantStaff, permission: keyof StaffPermissions): boolean {
  // Owners have all permissions
  if (staff.role === "owner") {
    return true
  }

  // Check specific permission
  return staff.permissions[permission] === true
}

export function canManageStaff(staff: RestaurantStaff): boolean {
  return staff.role === "owner" || hasPermission(staff, "staff")
}
