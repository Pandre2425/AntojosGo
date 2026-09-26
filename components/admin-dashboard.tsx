"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  LayoutDashboard,
  MenuIcon as MenuIconRestaurant,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Star,
  Activity,
} from "lucide-react"
import {
  getAdminStats,
  getAllRestaurants,
  getAllReviews,
  deleteRestaurant,
  deleteReview,
  adminLogout,
  type AdminUser,
  type AdminStats,
} from "@/lib/admin"
import type { RestaurantType } from "@/lib/restaurants"
import type { Review } from "@/lib/reviews"
import RestaurantForm from "./restaurant-form"

interface AdminDashboardProps {
  admin: AdminUser
  onLogout: () => void
}

export default function AdminDashboard({ admin, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"dashboard" | "restaurants" | "reviews" | "users" | "settings">(
    "dashboard",
  )
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [restaurants, setRestaurants] = useState<RestaurantType[]>([])
  const [reviews, setReviews] = useState<(Review & { restaurant_name: string })[]>([])
  const [loading, setLoading] = useState(true)
  const [showRestaurantForm, setShowRestaurantForm] = useState(false)
  const [editingRestaurant, setEditingRestaurant] = useState<RestaurantType | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, restaurantsData, reviewsData] = await Promise.all([
        getAdminStats(),
        getAllRestaurants(),
        getAllReviews(),
      ])
      setStats(statsData)
      setRestaurants(restaurantsData)
      setReviews(reviewsData)
    } catch (error) {
      console.error("Error loading admin data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    adminLogout()
    onLogout()
  }

  const handleDeleteRestaurant = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este restaurante?")) return

    const result = await deleteRestaurant(id)
    if (result.success) {
      setRestaurants((prev) => prev.filter((r) => r.id !== id))
    } else {
      alert("Error al eliminar el restaurante: " + result.error)
    }
  }

  const handleDeleteReview = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta reseña?")) return

    const result = await deleteReview(id)
    if (result.success) {
      setReviews((prev) => prev.filter((r) => r.id !== id))
    } else {
      alert("Error al eliminar la reseña: " + result.error)
    }
  }

  const handleRestaurantFormClose = () => {
    setShowRestaurantForm(false)
    setEditingRestaurant(null)
    loadData() // Reload data after form closes
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-GT", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-slate-600 to-slate-800 rounded-full flex items-center justify-center">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Admin Dashboard</h1>
              <p className="text-sm text-slate-600">AntojosGo Administration</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-600">Welcome, {admin.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm min-h-screen p-4">
          <div className="space-y-2">
            <Button
              variant={activeTab === "dashboard" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("dashboard")}
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <Button
              variant={activeTab === "restaurants" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("restaurants")}
            >
              <MenuIconRestaurant className="w-4 h-4 mr-2" />
              Restaurants
            </Button>
            <Button
              variant={activeTab === "reviews" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("reviews")}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Reviews
            </Button>
            <Button
              variant={activeTab === "users" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("users")}
            >
              <Users className="w-4 h-4 mr-2" />
              Users
            </Button>
            <Button
              variant={activeTab === "settings" ? "default" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("settings")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {showRestaurantForm ? (
            <RestaurantForm restaurant={editingRestaurant} onClose={handleRestaurantFormClose} />
          ) : (
            <>
              {activeTab === "dashboard" && stats && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-600">Total Restaurants</p>
                            <p className="text-3xl font-bold text-slate-800">{stats.totalRestaurants}</p>
                          </div>
                          <MenuIconRestaurant className="w-8 h-8 text-slate-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-600">Total Reviews</p>
                            <p className="text-3xl font-bold text-slate-800">{stats.totalReviews}</p>
                          </div>
                          <MessageSquare className="w-8 h-8 text-slate-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-600">Total Users</p>
                            <p className="text-3xl font-bold text-slate-800">{stats.totalUsers}</p>
                          </div>
                          <Users className="w-8 h-8 text-slate-400" />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-600">Average Rating</p>
                            <p className="text-3xl font-bold text-slate-800">{stats.averageRating}</p>
                          </div>
                          <Star className="w-8 h-8 text-slate-400" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {stats.recentActivity.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{activity.action}</p>
                              <p className="text-sm text-slate-600">by {activity.admin_name}</p>
                            </div>
                            <span className="text-sm text-slate-500">{formatDate(activity.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "restaurants" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-800">Restaurant Management</h2>
                    <Button onClick={() => setShowRestaurantForm(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Restaurant
                    </Button>
                  </div>

                  <div className="grid gap-4">
                    {restaurants.map((restaurant) => (
                      <Card key={restaurant.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                              <p className="text-slate-600 mb-2">{restaurant.description}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <Badge variant="secondary">{restaurant.cuisine_type}</Badge>
                                <div className="flex items-center gap-1">
                                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                                  <span>
                                    {restaurant.rating} ({restaurant.total_reviews} reviews)
                                  </span>
                                </div>
                                <span className="text-slate-500">Created {formatDate(restaurant.created_at)}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingRestaurant(restaurant)
                                  setShowRestaurantForm(true)
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteRestaurant(restaurant.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-800">Review Management</h2>

                  <div className="grid gap-4">
                    {reviews.map((review) => (
                      <Card key={review.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-semibold">{review.user_name}</h4>
                                <div className="flex items-center">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-4 h-4 ${
                                        star <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-slate-600 mb-2">Restaurant: {review.restaurant_name}</p>
                              {review.title && <h5 className="font-medium mb-1">{review.title}</h5>}
                              {review.comment && <p className="text-slate-700 mb-2">{review.comment}</p>}
                              <p className="text-sm text-slate-500">
                                Posted {formatDate(review.created_at)} • {review.helpful_count} helpful votes
                              </p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteReview(review.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "users" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-800">User Management</h2>
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">User Management</h3>
                      <p className="text-slate-600">User management features would be implemented here</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "settings" && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-slate-800">System Settings</h2>
                  <Card>
                    <CardContent className="p-8 text-center">
                      <Settings className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">System Settings</h3>
                      <p className="text-slate-600">System configuration options would be implemented here</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
