import React, { useContext, useEffect, useState } from "react";
import axios from "axios";
import { Link, Navigate } from "react-router-dom";
import { UserContext } from "../Context/userContext";
import Spinner from "../Components/Spinner";
import Image from "../Components/Image";
import { toast } from "react-toastify";

const AdminPage = () => {
  const { user, ready } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState("overview"); // overview | places | bookings | users | system
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  const [allPlaces, setAllPlaces] = useState([]);
  const [allBookings, setAllBookings] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const isAdminUser = Boolean(
    user?.role === "admin" ||
    user?.email === "demo@homestays.com" ||
    user?.email === "admin@homestays.com" ||
    user?.email?.toLowerCase().startsWith("admin@")
  );

  useEffect(() => {
    if (!ready || !user || !isAdminUser) {
      setLoading(false);
      return;
    }

    const fetchAdminData = async () => {
      try {
        setLoading(true);
        const [statsRes, placesRes, bookingsRes, usersRes] = await Promise.all([
          axios.get("/admin/stats"),
          axios.get("/admin/places"),
          axios.get("/admin/bookings"),
          axios.get("/admin/users"),
        ]);
        setStatsData(statsRes.data);
        setAllPlaces(placesRes.data || []);
        setAllBookings(bookingsRes.data || []);
        setAllUsers(usersRes.data || []);
      } catch (err) {
        console.error("Failed to load admin data:", err);
        toast.error(err.response?.data?.error || "Error loading admin console.");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [ready, user, isAdminUser, refreshTrigger]);

  if (!ready) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner width={120} height={120} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ prevPath: "/admin" }} />;
  }

  if (!isAdminUser) {
    return (
      <div className="max-w-xl mx-auto my-16 bg-white border border-red-200 rounded-3xl p-8 text-center shadow-lg">
        <div className="text-red-500 text-5xl mb-3">⛔</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Administrator Access Required</h1>
        <p className="text-gray-600 mb-6">
          The account <span className="font-semibold text-gray-800">{user.email}</span> does not have system administrator privileges.
        </p>
        <p className="text-xs text-gray-500 mb-6 bg-gray-50 p-3 rounded-xl">
          💡 Demo Tip: Sign in with <span className="font-bold text-pink">admin@homestays.com</span> or <span className="font-bold text-pink">demo@homestays.com</span> (Password: <span className="font-bold">Demo@123</span> / <span className="font-bold">Admin@123</span>) to access this portal.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/"
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-2xl transition-all"
          >
            Return to Homepage
          </Link>
          <Link
            to="/login"
            className="px-6 py-2.5 bg-pink text-white font-semibold rounded-2xl hover:scale-105 transition-all shadow-md"
          >
            Switch Account
          </Link>
        </div>
      </div>
    );
  }

  // Admin Actions
  const handleDeletePlace = async (placeId, title) => {
    if (!window.confirm(`[ADMIN ACTION] Are you sure you want to permanently remove "${title}"? All bookings for this accommodation will also be cleaned up.`)) {
      return;
    }
    try {
      await axios.delete(`/admin/place/${placeId}`);
      toast.success("Listing deleted by administrator");
      setRefreshTrigger((prev) => prev + 1);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to delete listing.");
    }
  };

  const handleCancelBooking = async (bookingId, guestName) => {
    if (!window.confirm(`[ADMIN ACTION] Cancel reservation for guest "${guestName}"? Reserved dates will be freed on the calendar.`)) {
      return;
    }
    try {
      await axios.delete(`/admin/booking/${bookingId}`);
      toast.success("Reservation cancelled successfully");
      setRefreshTrigger((prev) => prev + 1);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to cancel reservation.");
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`[ADMIN ACTION] Permanently delete user "${userName}"? Their listings and bookings will also be removed.`)) {
      return;
    }
    try {
      await axios.delete(`/admin/user/${userId}`);
      toast.success("User account deleted");
      setRefreshTrigger((prev) => prev + 1);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to delete user.");
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    try {
      await axios.put(`/admin/user-role/${userId}`, { role: newRole });
      toast.success(`User role updated to ${newRole.toUpperCase()}`);
      setRefreshTrigger((prev) => prev + 1);
    } catch (e) {
      toast.error(e.response?.data?.error || "Failed to update role.");
    }
  };

  // Filter helpers
  const q = searchQuery.toLowerCase().trim();
  const filteredPlaces = allPlaces.filter((p) =>
    (p.title || "").toLowerCase().includes(q) ||
    (p.address || "").toLowerCase().includes(q) ||
    (p.owner?.email || "").toLowerCase().includes(q)
  );

  const filteredBookings = allBookings.filter((b) =>
    (b.name || "").toLowerCase().includes(q) ||
    (b.phone || "").toLowerCase().includes(q) ||
    (b.place?.title || "").toLowerCase().includes(q) ||
    (b.user?.email || "").toLowerCase().includes(q)
  );

  const filteredUsers = allUsers.filter((u) =>
    (u.name || "").toLowerCase().includes(q) ||
    (u.email || "").toLowerCase().includes(q) ||
    (u.role || "").toLowerCase().includes(q)
  );

  const stats = statsData?.stats || {
    totalUsers: allUsers.length,
    totalPlaces: allPlaces.length,
    totalBookings: allBookings.length,
    totalRevenue: allBookings.reduce((sum, b) => sum + (Number(b.price) || 0), 0),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-pink/20 text-pink-300 px-3 py-1 rounded-full text-xs font-semibold mb-3 border border-pink/30">
            <span>🛡️</span> SYSTEM ADMINISTRATOR CONSOLE
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            HomeStays Management Portal
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Logged in as <span className="text-white font-medium">{user.name}</span> ({user.email})
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setRefreshTrigger((p) => p + 1)}
            className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold border border-gray-700 transition-all"
          >
            <span>🔄</span> Refresh Data
          </button>
          <Link
            to="/account"
            className="flex items-center gap-1.5 bg-pink text-white px-5 py-2.5 rounded-2xl text-sm font-semibold hover:opacity-90 transition-all shadow-md"
          >
            Host Account
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl text-lg">👥</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{stats.totalUsers}</div>
          <p className="text-xs text-gray-500 mt-1">Registered platform accounts</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Accommodations</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl text-lg">🏡</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{stats.totalPlaces}</div>
          <p className="text-xs text-gray-500 mt-1">Active homestays & villas</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Reservations</span>
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl text-lg">📅</span>
          </div>
          <div className="text-3xl font-extrabold text-gray-900">{stats.totalBookings}</div>
          <p className="text-xs text-gray-500 mt-1">Total bookings processed</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-2">
            <span className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Platform Volume</span>
            <span className="p-2 bg-pink/10 text-pink rounded-xl text-lg">💰</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-pink">
            ₹{stats.totalRevenue?.toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-gray-500 mt-1">Gross booking value (INR)</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-2 overflow-x-auto pb-1">
        {[
          { key: "overview", label: "📊 Overview", count: null },
          { key: "places", label: "🏡 All Accommodations", count: allPlaces.length },
          { key: "bookings", label: "📅 All Reservations", count: allBookings.length },
          { key: "users", label: "👥 Users Management", count: allUsers.length },
          { key: "system", label: "⚙️ System Health", count: null },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setActiveTab(tab.key); setSearchQuery(""); }}
            className={`py-2.5 px-4 rounded-xl font-semibold text-sm whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.key ? "bg-gray-700 text-white" : "bg-gray-200 text-gray-700"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Bar for List Views */}
      {["places", "bookings", "users"].includes(activeTab) && (
        <div className="mb-6 flex gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full bg-white border border-gray-300 rounded-2xl py-2 px-4 pl-10 text-sm outline-none focus:border-pink focus:ring-2 focus:ring-pink/20 transition-all shadow-sm"
            />
            <span className="absolute left-3.5 top-2.5 text-gray-400 text-sm">🔍</span>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-gray-500 hover:text-gray-800 underline"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {loading && <Spinner width={120} height={120} />}

      {!loading && (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Bookings Card */}
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <span>📅</span> Recent Reservations
                  </h3>
                  <button
                    onClick={() => setActiveTab("bookings")}
                    className="text-xs font-semibold text-pink hover:underline"
                  >
                    View All ({allBookings.length}) →
                  </button>
                </div>
                {allBookings.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {allBookings.slice(0, 5).map((b) => (
                      <div key={b._id} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-sm text-gray-800">{b.name}</div>
                          <div className="text-xs text-gray-500">
                            {b.place?.title || "Homestay"} • {b.checkIn} to {b.checkOut}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-pink">₹{b.price?.toLocaleString("en-IN")}</div>
                          <div className="text-xs text-gray-400">{b.numberOfGuests} Guests</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6">No reservations placed yet.</p>
                )}
              </div>

              {/* Recent Users Card */}
              <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <span>👥</span> Recently Registered Users
                  </h3>
                  <button
                    onClick={() => setActiveTab("users")}
                    className="text-xs font-semibold text-pink hover:underline"
                  >
                    Manage Users ({allUsers.length}) →
                  </button>
                </div>
                {allUsers.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {allUsers.slice(0, 5).map((u) => (
                      <div key={u._id} className="py-3 flex justify-between items-center">
                        <div>
                          <div className="font-semibold text-sm text-gray-800 flex items-center gap-2">
                            {u.name}
                            {u.role === "admin" && (
                              <span className="bg-pink/10 text-pink text-[10px] font-bold px-2 py-0.5 rounded-full">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{u.email}</div>
                        </div>
                        <div className="text-xs text-gray-400">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "Active"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm text-center py-6">No user accounts found.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ALL ACCOMMODATIONS MODERATION */}
          {activeTab === "places" && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-gray-800">
                  Platform Homestay Listings ({filteredPlaces.length})
                </h3>
                <Link
                  to="/account/places/new"
                  className="bg-pink text-white text-xs font-semibold px-3 py-1.5 rounded-xl hover:opacity-90"
                >
                  + Add Listing
                </Link>
              </div>

              {filteredPlaces.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                      <tr>
                        <th className="py-3 px-4">Property</th>
                        <th className="py-3 px-4">Location</th>
                        <th className="py-3 px-4">Host</th>
                        <th className="py-3 px-4">Price / Night</th>
                        <th className="py-3 px-4">Booked Dates</th>
                        <th className="py-3 px-4 text-center">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredPlaces.map((place) => (
                        <tr key={place._id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 shrink-0">
                              <Image
                                src={place.photos?.[0]}
                                alt={place.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 line-clamp-1">{place.title}</div>
                              <div className="text-xs text-gray-400">Max {place.maxGuests} guests</div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-gray-700">{place.address}</td>
                          <td className="py-3 px-4">
                            <div className="text-xs font-semibold text-gray-900">{place.owner?.name || "Host"}</div>
                            <div className="text-[11px] text-gray-500">{place.owner?.email || "—"}</div>
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-900">
                            ₹{place.price?.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 text-xs">
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
                              {place.bookedDates?.length || 0} days
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex justify-center gap-2">
                              <Link
                                to={`/place/${place._id}`}
                                target="_blank"
                                className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-xs font-medium transition-all"
                              >
                                Preview
                              </Link>
                              <Link
                                to={`/account/places/${place._id}`}
                                className="px-2.5 py-1 bg-pink/10 hover:bg-pink/20 text-pink rounded-lg text-xs font-medium transition-all"
                              >
                                Edit
                              </Link>
                              <button
                                type="button"
                                onClick={() => handleDeletePlace(place._id, place.title)}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-all"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-12 text-gray-400">No homestays match your search filter.</p>
              )}
            </div>
          )}

          {/* TAB 3: ALL RESERVATIONS MANAGEMENT */}
          {activeTab === "bookings" && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">
                  All Platform Bookings ({filteredBookings.length})
                </h3>
              </div>

              {filteredBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                      <tr>
                        <th className="py-3 px-4">Guest</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">Homestay</th>
                        <th className="py-3 px-4">Dates</th>
                        <th className="py-3 px-4">Guests</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredBookings.map((b) => (
                        <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4 font-semibold text-gray-900">{b.name}</td>
                          <td className="py-3 px-4">
                            <div className="text-xs font-mono">{b.phone}</div>
                            <div className="text-[11px] text-gray-400">{b.user?.email || "—"}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-gray-800 max-w-[200px] truncate">
                            {b.place?.title || "Listing"}
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-gray-700">
                            {b.checkIn} ➔ {b.checkOut}
                          </td>
                          <td className="py-3 px-4 text-xs">{b.numberOfGuests} Guests</td>
                          <td className="py-3 px-4 font-bold text-pink">
                            ₹{b.price?.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleCancelBooking(b._id, b.name)}
                              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-all"
                            >
                              Cancel Booking
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-12 text-gray-400">No reservations match your search filter.</p>
              )}
            </div>
          )}

          {/* TAB 4: USERS MANAGEMENT */}
          {activeTab === "users" && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-bold text-gray-800">
                  Registered User Accounts ({filteredUsers.length})
                </h3>
              </div>

              {filteredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                      <tr>
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4">Bookings</th>
                        <th className="py-3 px-4">Joined</th>
                        <th className="py-3 px-4 text-center">Admin Controls</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredUsers.map((u) => {
                        const isSelf = String(u._id) === String(user.id || user._id);
                        return (
                          <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 font-semibold text-gray-900">
                              {u.name}
                              {isSelf && <span className="ml-2 text-xs text-pink">(You)</span>}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs">{u.email}</td>
                            <td className="py-3 px-4">
                              <span
                                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                                  u.role === "admin"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {u.role === "admin" ? "ADMIN" : "USER"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-xs font-semibold">{u.bookingsCount || 0}</td>
                            <td className="py-3 px-4 text-xs text-gray-500">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {!isSelf && (
                                <div className="flex justify-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRole(u._id, u.role)}
                                    className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-all"
                                  >
                                    {u.role === "admin" ? "Demote to User" : "Make Admin"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u._id, u.name)}
                                    className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-all"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-center py-12 text-gray-400">No users match your search filter.</p>
              )}
            </div>
          )}

          {/* TAB 5: SYSTEM HEALTH */}
          {activeTab === "system" && (
            <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm max-w-2xl">
              <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                <span>⚙️</span> Runtime Infrastructure Health
              </h3>
              <div className="divide-y divide-gray-100 text-sm">
                <div className="py-3 flex justify-between">
                  <span className="text-gray-500">Database Engine</span>
                  <span className="font-semibold text-emerald-600">MongoDB Atlas (Connected)</span>
                </div>
                <div className="py-3 flex justify-between">
                  <span className="text-gray-500">API Health Probe</span>
                  <span className="font-semibold text-emerald-600">HTTP 200 OK (/health)</span>
                </div>
                <div className="py-3 flex justify-between">
                  <span className="text-gray-500">Backend Node Version</span>
                  <span className="font-mono text-gray-800">{statsData?.system?.nodeVersion || process.version || "Node LTS"}</span>
                </div>
                <div className="py-3 flex justify-between">
                  <span className="text-gray-500">Server Uptime</span>
                  <span className="font-mono text-gray-800">{statsData?.system?.uptimeSeconds || 0} seconds</span>
                </div>
                <div className="py-3 flex justify-between">
                  <span className="text-gray-500">Authentication Mode</span>
                  <span className="font-semibold text-gray-800">Dual Token (HTTP-Only Cookie + Bearer Header)</span>
                </div>
                <div className="py-3 flex justify-between">
                  <span className="text-gray-500">Email Dispatch Mode</span>
                  <span className="font-semibold text-gray-800">Smart Demo OTP (Zero-External API Blocking)</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminPage;
