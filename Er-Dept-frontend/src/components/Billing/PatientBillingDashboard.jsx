import React, { useState, useEffect } from "react";
import { Search, Download, RefreshCw, Plus } from "lucide-react";
import { supabaseclient as supabase } from "../Config/supabase";
import { useAuth } from "../Auth/Authprovider";
import CreateBillForm from "./CreateBillForm";

export default function PatientBillingDashboard() {
  const { user } = useAuth();
  const [billings, setBillings] = useState([]);
  const [filteredBillings, setFilteredBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Fetch billing data from Supabase
  useEffect(() => {
    fetchBillings();
  }, []);

  const fetchBillings = async () => {
    try {
      setLoading(true);
      
      // Build the base query
      let query = supabase
        .from('billing_transactions')
        .select(`
          *,
          patient:patient_payment_summary (id, first_name, last_name, phone, email),
          service:service_id (id, name, price)
        `)
        .order('created_at', { ascending: false });

      // Apply filters if needed
      if (searchTerm) {
        query = query.or(
          `patient.first_name.ilike.%${searchTerm}%,patient.last_name.ilike.%${searchTerm}%,patient.phone.ilike.%${searchTerm}%`
        );
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setBillings(data || []);
      setFilteredBillings(data || []);
    } catch (error) {
      console.error('Error fetching billings:', error);
      // You might want to show an error message to the user here
    } finally {
      setLoading(false);
    }
    try {
      setLoading(true);
      const { data, error } = await supabaseclient
        .from("billing_transactions")
        .select(`
          *,
          patient:patient_id (id, first_name, last_name, phone, email),
          service:service_id (id, name, price)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setBillings(data || []);
      setFilteredBillings(data || []);
    } catch (error) {
      console.error("Error fetching billings:", error);
      setBillings([]);
      setFilteredBillings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm(value);
    filterBillings(value, statusFilter);
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    filterBillings(searchTerm, status);
  };

  const handleBillCreated = (newBill) => {
    setBillings(prev => [newBill, ...prev]);
    setFilteredBillings(prev => [newBill, ...prev]);
  };

  const filterBillings = (search, status) => {
    let result = [...billings];

    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (item) =>
          (item.patient?.first_name?.toLowerCase().includes(searchLower) ||
          item.patient?.last_name?.toLowerCase().includes(searchLower) ||
          item.patient?.phone?.includes(search) ||
          item.invoice_number?.toLowerCase().includes(searchLower))
      );
    }

    if (status !== "all") {
      result = result.filter((item) => item.status === status);
    }

    setFilteredBillings(result);
  };

  const handleRefresh = () => {
    fetchBillings();
  };

  const handleDownloadReceipt = async (id) => {
    try {
      const { data, error } = await supabase
        .from('billing_transactions')
        .select('invoice_url')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      if (data?.invoice_url) {
        window.open(data.invoice_url, '_blank');
      } else {
        console.warn('No invoice URL found for this bill');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      overdue: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          statusMap[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (loading && !billings.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {showCreateForm && (
        <CreateBillForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={handleBillCreated}
        />
      )}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Billing Dashboard</h1>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Bill
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
        <div className="px-4 py-5 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-64 mb-4 sm:mb-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search bills..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="flex space-x-2 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => handleStatusFilter("all")}
              className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap ${
                statusFilter === "all"
                  ? "bg-blue-100 text-blue-800"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleStatusFilter("paid")}
              className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap ${
                statusFilter === "paid"
                  ? "bg-green-100 text-green-800"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Paid
            </button>
            <button
              onClick={() => handleStatusFilter("pending")}
              className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap ${
                statusFilter === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => handleStatusFilter("overdue")}
              className={`px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap ${
                statusFilter === "overdue"
                  ? "bg-red-100 text-red-800"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Overdue
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice No.
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBillings.length > 0 ? (
                filteredBillings.map((billing) => (
                  <tr key={billing.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {billing.invoice_number || `INV-${billing.id.toString().padStart(4, '0')}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {billing.patient ? 
                          `${billing.patient.first_name} ${billing.patient.last_name}` : 
                          'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {billing.patient?.phone || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {billing.service?.name || billing.service_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(billing.date || billing.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                      ${parseFloat(billing.amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(billing.status)}
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleDownloadReceipt(billing.id)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Download Receipt"
                    >
                      <Download className="h-5 w-5" />
                    </button>
                  </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                    No billing records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
