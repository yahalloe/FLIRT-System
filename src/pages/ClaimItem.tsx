import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { customToast } from '../components/ToastProvider';
import { LoadingSpinner, InlineLoader } from '../components/LoadingSpinner';
import { Search, Calendar, MapPin, Package, CheckCircle2, AlertCircle, XCircle, Clock, FileText } from 'lucide-react';

const API_URL = 'http://localhost:5001';

interface Item {
  id: number;
  name: string;
  description: string;
  category: string;
  status: string;
  location: string;
  date: string;
  image_url: string | null;
  claim_status: string;
  reporter_name: string;
  reporter_email: string;
  created_at: string;
}

interface Claim {
  id: number;
  item_id: number;
  status: 'pending' | 'approved' | 'rejected';
  verification_message: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export function ClaimItem() {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Claim modal state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // User claims state
  const [userClaims, setUserClaims] = useState<Claim[]>([]);

  // Fetch items on mount
  useEffect(() => {
    fetchItems();
    fetchUserClaims();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
    filterItems();
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, categoryFilter, statusFilter, items]);

  useEffect(() => {
    const token = localStorage.getItem('flirt_token');
    setIsAuthenticated(!!token);
  }, []);

  const fetchItems = useCallback(async (retry = false) => {
    if (retry) {
      setRetryCount(prev => prev + 1);
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('claimStatus', 'unclaimed');
      
      const response = await fetch(`${API_URL}/api/items?${params.toString()}`, {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch items');
      }

      setItems(data.data || []);
      setRetryCount(0); // Reset retry count on success
    } catch (err: any) {
      console.error('Error fetching items:', err);
      
      // Show mock data when backend is not available
      const mockItems = [
        {
          id: 1,
          name: "iPhone 13",
          description: "Black iPhone 13 with blue case",
          category: "electronics",
          status: "found",
          location: "Library - 2nd floor",
          date: "2024-01-15",
          image_url: null,
          claim_status: "unclaimed",
          reporter_name: "John Doe",
          reporter_email: "john@example.com",
          created_at: "2024-01-15T10:30:00Z"
        },
        {
          id: 2,
          name: "Red Backpack",
          description: "Nike red backpack with laptop compartment",
          category: "bags",
          status: "lost",
          location: "Cafeteria",
          date: "2024-01-14",
          image_url: null,
          claim_status: "unclaimed",
          reporter_name: "Jane Smith",
          reporter_email: "jane@example.com",
          created_at: "2024-01-14T14:20:00Z"
        },
        {
          id: 3,
          name: "Student ID Card",
          description: "CCIS student ID - Sarah Johnson",
          category: "accessories",
          status: "found",
          location: "Computer Lab A",
          date: "2024-01-13",
          image_url: null,
          claim_status: "unclaimed",
          reporter_name: "Mike Wilson",
          reporter_email: "mike@example.com",
          created_at: "2024-01-13T09:15:00Z"
        }
      ];
      
      setItems(mockItems);
      setFilteredItems(mockItems);
      customToast.info('Demo Mode', 'Showing sample data - backend server not available');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUserClaims = async () => {
    try {
      const token = localStorage.getItem('flirt_token');
      if (!token) return;

      const response = await fetch(`${API_URL}/api/claims`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserClaims(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching user claims:', err);
    }
  };

  const filterItems = useCallback(() => {
    let filtered = [...items];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredItems(filtered);
  }, [items, searchQuery, categoryFilter, statusFilter]);

  const getClaimForItem = useCallback((itemId: number): Claim | undefined => {
    return userClaims.find(claim => claim.item_id === itemId);
  }, [userClaims]);

  const handleClaimItem = useCallback((item: Item) => {
    const existingClaim = getClaimForItem(item.id);
    if (existingClaim) {
      customToast.info('Already Claimed', 'You have already submitted a claim for this item');
      return;
    }

    setSelectedItem(item);
    setVerificationMessage('');
    setIsClaimModalOpen(true);
  }, [getClaimForItem]);

  const submitClaim = async () => {
    if (!selectedItem) return;
  
    if (!isAuthenticated) {
      customToast.error('Login Required', 'Please log in to submit a claim');
      setIsClaimModalOpen(false);
      return;
    }
  
    if (verificationMessage.trim().length < 10) {
      customToast.error('Message Too Short', 'Verification message must be at least 10 characters');
      return;
    }
  
    setIsSubmittingClaim(true);
    const toastId = customToast.loading('Submitting your claim...');
  
    try {
      const token = localStorage.getItem('flirt_token');
      
      const response = await fetch(`${API_URL}/api/claims`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: selectedItem.id,
          verificationMessage: verificationMessage.trim(),
        }),
      });
  
      const data = await response.json();
  
      customToast.dismiss(toastId);
  
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit claim');
      }
  
      customToast.success('Claim Submitted Successfully!', 'Your claim has been submitted and is pending review.');
  
      await fetchUserClaims();
      setIsClaimModalOpen(false);
      setSelectedItem(null);
      setVerificationMessage('');
  
    } catch (err: any) {
      console.error('Error submitting claim:', err);
      customToast.dismiss(toastId);
      
      if (err.message.includes('Failed to fetch') || err.message.includes('Connection refused')) {
        customToast.success('Demo Mode - Claim Submitted!', 'Your claim would be submitted successfully.');
        setIsClaimModalOpen(false);
        setSelectedItem(null);
        setVerificationMessage('');
      } else {
        customToast.error('Failed to Submit Claim', err.message);
      }
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const getClaimStatusBadge = useCallback((claim: Claim) => {
    switch (claim.status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
    }
  }, []);

  const getCategoryIcon = useCallback((category: string) => {
    switch (category) {
      case 'electronics':
        return '📱';
      case 'clothing':
        return '👕';
      case 'accessories':
        return '⌚';
      case 'bags':
        return '🎒';
      case 'keys':
        return '🔑';
      case 'books':
        return '📚';
      default:
        return '📦';
    }
  }, []);

  // Memoized items list to prevent unnecessary re-renders
  const itemsList = useMemo(() => {
    if (filteredItems.length === 0) {
  return (
              <div className="col-span-full text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-[#D8E6F3]" />
                <p className="text-[#6B7280]">No items found matching your search</p>
              </div>
      );
    }

    return filteredItems.map((item) => {
                const existingClaim = getClaimForItem(item.id);
                return (
                  <Card
                    key={item.id}
                    className="overflow-hidden border border-[#E5E7EB] rounded-xl shadow-sm hover:shadow-md transition-shadow"
                    role="listitem"
                  >
                    {/* Image */}
                    {item.image_url ? (
                      <img
                        src={`${API_URL}${item.image_url}`}
                        alt={item.name}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-[#D8E6F3] to-[#F8FAFB] flex items-center justify-center">
                        <span className="text-6xl">{getCategoryIcon(item.category)}</span>
                      </div>
                    )}

                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-[#1F2937] font-medium">{item.name}</h3>
                        <Badge
                          className={
                            item.status === 'lost'
                              ? 'bg-orange-100 text-orange-800 border-orange-200'
                              : 'bg-blue-100 text-blue-800 border-blue-200'
                          }
                        >
                          {item.status === 'lost' ? '🔍 Lost' : '✅ Found'}
                        </Badge>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-[#6B7280] mb-3 line-clamp-2">
                        {item.description}
                      </p>

                      {/* Details */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                          <Calendar className="w-3 h-3" />
                          {new Date(item.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                          <Package className="w-3 h-3" />
                          {item.category}
                        </div>
                      </div>

                      {/* Claim Status or Button */}
                      {existingClaim ? (
                        <div className="space-y-2">
                          {getClaimStatusBadge(existingClaim)}
                          {existingClaim.status === 'rejected' && existingClaim.admin_notes && (
                            <p className="text-xs text-red-600">
                              Reason: {existingClaim.admin_notes}
                            </p>
                          )}
                          {existingClaim.status === 'approved' && (
                            <p className="text-xs text-green-600">
                              Contact: {item.reporter_email}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleClaimItem(item)}
                          size="lg"
                          className="w-full bg-[#5B8FB9] hover:bg-[#4A7A9F] text-white h-11 md:h-auto"
                          aria-label={`Claim ${item.name}`}
                        >
                          Claim This Item
                        </Button>
                      )}
                    </div>
                  </Card>
                );
    });
  }, [filteredItems, getClaimForItem, getCategoryIcon, getClaimStatusBadge, handleClaimItem]);

  return (
    <div className="min-h-screen bg-[#F8FAFB] py-6 md:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#5B8FB9] to-[#7FAFD9] rounded-xl flex items-center justify-center shadow-lg" aria-hidden="true">
              <Search className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[#1F2937] mb-1">Claim an Item</h1>
              <p className="text-[#6B7280]">Search for your lost item and submit a claim</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card className="p-6 mb-6 bg-white border border-[#E5E7EB] rounded-xl shadow-sm" role="search" aria-label="Search and filter items">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <Label htmlFor="search" className="text-[#1F2937] mb-2 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                <Input
                  id="search"
                  placeholder="Search by name, description, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-[#D8E6F3] focus:border-[#5B8FB9] focus:ring-[#5B8FB9]"
                  aria-label="Search items by name, description, or location"
                  type="search"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <Label className="text-[#1F2937] mb-2 block">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="border-[#D8E6F3] focus:border-[#5B8FB9] focus:ring-[#5B8FB9]">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="electronics">📱 Electronics</SelectItem>
                  <SelectItem value="clothing">👕 Clothing</SelectItem>
                  <SelectItem value="accessories">⌚ Accessories</SelectItem>
                  <SelectItem value="bags">🎒 Bags</SelectItem>
                  <SelectItem value="keys">🔑 Keys</SelectItem>
                  <SelectItem value="books">📚 Books</SelectItem>
                  <SelectItem value="other">📦 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div>
              <Label className="text-[#1F2937] mb-2 block">Type</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-[#D8E6F3] focus:border-[#5B8FB9] focus:ring-[#5B8FB9]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="lost">🔍 Lost Items</SelectItem>
                  <SelectItem value="found">✅ Found Items</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-[#6B7280]">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchItems()}
            className="border-[#D8E6F3] text-[#5B8FB9] hover:bg-[#D8E6F3]/20"
            aria-label="Refresh items list"
          >
            Refresh
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <InlineLoader message="Loading items..." size="lg" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800 flex items-center justify-between">
              <span>{error}</span>
              {retryCount < 3 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchItems(true)}
                  className="ml-4 border-red-300 text-red-700 hover:bg-red-100"
                >
                  Retry
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Items Grid */}
        {!isLoading && !error && (
          <div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            role="list"
            aria-label="Lost and found items"
          >
            {itemsList}
          </div>
        )}
      </div>

      {/* Claim Modal */}
      <Dialog open={isClaimModalOpen} onOpenChange={setIsClaimModalOpen}>
        <DialogContent className="sm:max-w-[500px]" aria-labelledby="claim-dialog-title" aria-describedby="claim-dialog-description">
          <DialogHeader>
            <DialogTitle id="claim-dialog-title" className="text-[#1F2937]">Submit Claim</DialogTitle>
            <DialogDescription id="claim-dialog-description" className="text-[#6B7280]">
              Provide verification details to prove this item belongs to you
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-4">
              {/* Item Info */}
              <div className="bg-[#F8FAFB] p-4 rounded-lg border border-[#D8E6F3]">
                <h4 className="font-medium text-[#1F2937] mb-2">{selectedItem.name}</h4>
                <p className="text-sm text-[#6B7280] mb-2">{selectedItem.description}</p>
                <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedItem.location}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(selectedItem.date).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Verification Message */}
              <div>
                <Label htmlFor="verification" className="text-[#1F2937] mb-2 block">
                  Verification Details *
                </Label>
                <Textarea
                  id="verification"
                  placeholder="Describe unique features, what's inside, purchase details, or any other information that proves this item is yours..."
                  value={verificationMessage}
                  onChange={(e) => setVerificationMessage(e.target.value)}
                  className="min-h-[120px] border-[#D8E6F3] focus:border-[#5B8FB9] focus:ring-[#5B8FB9]"
                  disabled={isSubmittingClaim}
                  minLength={10}
                  maxLength={1000}
                  aria-required="true"
                  aria-invalid={verificationMessage.length > 0 && verificationMessage.length < 10}
                  aria-describedby="verification-help"
                />
                <p className="text-xs text-[#6B7280] mt-1" id="verification-help" role="status" aria-live="polite">
                  {verificationMessage.length}/1000 characters (minimum 10)
                </p>
              </div>

              {/* Info Alert */}
              <Alert className="bg-blue-50 border-blue-200">
                <FileText className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  Your claim will be reviewed by the item owner. Be as specific as possible to verify ownership.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsClaimModalOpen(false)}
              disabled={isSubmittingClaim}
              className="w-full sm:w-auto border-[#D8E6F3] h-11"
            >
              Cancel
            </Button>
            <Button
              onClick={submitClaim}
              disabled={isSubmittingClaim || verificationMessage.length < 10}
              className="w-full sm:w-auto bg-[#5B8FB9] hover:bg-[#4A7A9F] text-white h-11"
            >
              {isSubmittingClaim ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Claim'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
