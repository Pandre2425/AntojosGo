"use client"

import { useState, useEffect } from "react"
import { Plus, Shield, MoreVertical, UserCheck, UserX, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  getRestaurantStaff,
  getPendingInvitations,
  inviteStaffMember,
  updateStaffMember,
  removeStaffMember,
  canManageStaff,
  DEFAULT_PERMISSIONS,
  type RestaurantStaff,
  type RestaurantInvitation,
  type StaffPermissions,
} from "@/lib/restaurant-staff"

interface StaffManagementProps {
  restaurantId: string
  currentUser: RestaurantStaff
}

export default function StaffManagement({ restaurantId, currentUser }: StaffManagementProps) {
  const [staff, setStaff] = useState<RestaurantStaff[]>([])
  const [invitations, setInvitations] = useState<RestaurantInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "staff",
    permissions: DEFAULT_PERMISSIONS.staff,
  })

  useEffect(() => {
    loadStaffData()
  }, [restaurantId])

  const loadStaffData = async () => {
    setLoading(true)
    try {
      const [staffData, invitationsData] = await Promise.all([
        getRestaurantStaff(restaurantId),
        getPendingInvitations(restaurantId),
      ])
      setStaff(staffData)
      setInvitations(invitationsData)
    } catch (error) {
      console.error("Error loading staff data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleInviteStaff = async () => {
    if (!inviteForm.email || !inviteForm.role) return

    const result = await inviteStaffMember(
      restaurantId,
      inviteForm.email,
      inviteForm.role,
      inviteForm.permissions,
      currentUser.id,
    )

    if (result.success) {
      setShowInviteDialog(false)
      setInviteForm({
        email: "",
        role: "staff",
        permissions: DEFAULT_PERMISSIONS.staff,
      })
      loadStaffData()
    } else {
      alert(`Error inviting staff member: ${result.error}`)
    }
  }

  const handleUpdateStaff = async (staffId: string, updates: Partial<RestaurantStaff>) => {
    const result = await updateStaffMember(staffId, updates)
    if (result.success) {
      loadStaffData()
    } else {
      alert(`Error updating staff member: ${result.error}`)
    }
  }

  const handleRemoveStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to remove this staff member?")) return

    const result = await removeStaffMember(staffId)
    if (result.success) {
      loadStaffData()
    } else {
      alert(`Error removing staff member: ${result.error}`)
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "owner":
        return "bg-purple-100 text-purple-800"
      case "manager":
        return "bg-blue-100 text-blue-800"
      case "staff":
        return "bg-green-100 text-green-800"
      case "viewer":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "suspended":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const updateInvitePermissions = (permission: keyof StaffPermissions, checked: boolean) => {
    setInviteForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: checked,
      },
    }))
  }

  const handleRoleChange = (role: string) => {
    setInviteForm((prev) => ({
      ...prev,
      role,
      permissions: DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.staff,
    }))
  }

  if (!canManageStaff(currentUser)) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600">You don't have permission to manage staff members.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <p className="text-gray-600">Manage your restaurant team and permissions</p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button className="bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4 mr-2" />
              Invite Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Invite New Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="staff@example.com"
                />
              </div>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select value={inviteForm.role} onValueChange={handleRoleChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Permissions</Label>
                <div className="space-y-2 mt-2">
                  {Object.entries(inviteForm.permissions).map(([permission, enabled]) => (
                    <div key={permission} className="flex items-center space-x-2">
                      <Checkbox
                        id={permission}
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          updateInvitePermissions(permission as keyof StaffPermissions, checked as boolean)
                        }
                      />
                      <Label htmlFor={permission} className="capitalize">
                        {permission}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleInviteStaff} className="flex-1 bg-red-600 hover:bg-red-700">
                  Send Invitation
                </Button>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <p className="font-medium">{invitation.email}</p>
                    <p className="text-sm text-gray-600">
                      Invited as {invitation.role} • Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Team Members ({staff.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading staff...</div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No staff members found.</div>
          ) : (
            <div className="space-y-4">
              {staff.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {member.user_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{member.user_name}</h3>
                      <p className="text-sm text-gray-600">{member.user_email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getRoleBadgeColor(member.role)}>{member.role}</Badge>
                        <Badge className={getStatusBadgeColor(member.status)}>{member.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right text-sm text-gray-600">
                      <p>Joined {new Date(member.created_at).toLocaleDateString()}</p>
                      {member.last_login && <p>Last login {new Date(member.last_login).toLocaleDateString()}</p>}
                    </div>
                    {member.role !== "owner" && currentUser.role === "owner" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              handleUpdateStaff(member.id, {
                                status: member.status === "active" ? "suspended" : "active",
                              })
                            }
                          >
                            {member.status === "active" ? (
                              <>
                                <UserX className="h-4 w-4 mr-2" />
                                Suspend
                              </>
                            ) : (
                              <>
                                <UserCheck className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRemoveStaff(member.id)} className="text-red-600">
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
