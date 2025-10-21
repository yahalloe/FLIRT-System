import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { customToast } from '../components/ToastProvider';
import { Upload, CheckCircle2, AlertCircle, X, Image as ImageIcon, FileText } from 'lucide-react';

const API_URL = 'http://localhost:5000';

// Simple Loading Spinner Component
function LoadingSpinner({ size = 'sm', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };
  
  return (
    <div className={`animate-spin rounded-full border-b-2 border-white ${sizeClasses[size]} ${className}`} />
  );
}

export function ReportItem() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    status: '',
    location: '',
    date: '',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (file) {
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        customToast.error('File Too Large', 'File size must be less than 5MB');
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setError('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
        customToast.error('Invalid File Type', 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
        return;
      }

      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const validateForm = (): string | null => {
    // Check required fields
    if (!formData.name.trim()) return 'Item name is required';
    if (!formData.description.trim()) return 'Description is required';
    if (formData.description.trim().length < 10) return 'Description must be at least 10 characters';
    if (!formData.category) return 'Category is required';
    if (!formData.status) return 'Status is required';
    if (!formData.location.trim()) return 'Location is required';
    if (!formData.date) return 'Date is required';

    // Check name length
    if (formData.name.trim().length < 3) return 'Item name must be at least 3 characters';
    if (formData.name.trim().length > 255) return 'Item name must be less than 255 characters';

    // Check location length
    if (formData.location.trim().length < 3) return 'Location must be at least 3 characters';
    if (formData.location.trim().length > 255) return 'Location must be less than 255 characters';

    // Check date validity
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate > today) return 'Date cannot be in the future';

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      customToast.error('Validation Error', validationError);
      setIsLoading(false);
      return;
    }

    const toastId = customToast.loading('Submitting your report...');

    try {
      // Get token from localStorage
      const token = localStorage.getItem('flirt_token');
      if (!token) {
        throw new Error('Please log in to report an item');
      }

      // Create FormData for file upload
      const submitData = new FormData();
      submitData.append('name', formData.name.trim());
      submitData.append('description', formData.description.trim());
      submitData.append('category', formData.category);
      submitData.append('status', formData.status);
      submitData.append('location', formData.location.trim());
      submitData.append('date', formData.date);
      
      if (imageFile) {
        submitData.append('image', imageFile);
      }

      // Submit to backend
      const response = await fetch(`${API_URL}/api/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: submitData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to report item');
      }

      // Success!
      setSuccess(true);
      customToast.dismiss(toastId);
      customToast.success(
        'Item Reported Successfully!', 
        `Your ${formData.status} item has been reported and will be visible to other users.`
      );

      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          name: '',
          description: '',
          category: '',
          status: '',
          location: '',
          date: '',
        });
        setImageFile(null);
        setImagePreview(null);
        setSuccess(false);
        setError(null);
      }, 2000);

    } catch (err: any) {
      console.error('Error submitting item:', err);
      const errorMessage = err.message || 'Failed to report item. Please try again.';
      setError(errorMessage);
      customToast.dismiss(toastId);
      customToast.error('Submission Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Set today's date as default for date input
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-[#F8FAFB] py-6 md:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#5B8FB9] to-[#7FAFD9] rounded-xl flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-[#1F2937] mb-1">Report an Item</h1>
              <p className="text-[#6B7280]">Fill out the form below to report a lost or found item</p>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Item Reported Successfully!</strong>
              <br />
              Your item has been added to the database and is now visible to other users.
            </AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <Card className="p-8 bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Item Name */}
            <div>
              <Label htmlFor="name" className="text-[#1F2937]">Item Name *</Label>
              <Input
                id="name"
                required
                placeholder="e.g., Black Backpack, iPhone 13, Keys"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-2 border-[#D8E6F3] focus:border-[#5B8FB9] focus:ring-[#5B8FB9]"
                disabled={isLoading}
              />
              <p className="text-xs text-[#6B7280] mt-1">
                {formData.name.length}/255 characters (minimum 3)
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-[#1F2937]">Description *</Label>
              <Textarea
                id="description"
                required
                placeholder="Provide detailed description (color, size, distinguishing features)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-2 border-[#D8E6F3] focus:border-[#5B8FB9] focus:ring-[#5B8FB9] min-h-[120px]"
                disabled={isLoading}
              />
              <p className="text-xs text-[#6B7280] mt-1">
                {formData.description.length}/1000 characters (minimum 10)
              </p>
            </div>

            {/* Category */}
            <div>
              <Label htmlFor="category" className="text-[#1F2937]">Category *</Label>
              <Select 
                required
                value={formData.category}
                onValueChange={(value: string) => setFormData({ ...formData, category: value })}
                disabled={isLoading}
              >
                <SelectTrigger className="mt-2 border-[#D8E6F3] focus:border-[#5B8FB9] focus:ring-[#5B8FB9]">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
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

            {/* Status */}
            <div>
              <Label htmlFor="status" className="text-[#1F2937]">Status *</Label>
              <Select 
                required
                value={formData.status}
                onValueChange={(value: string) => setFormData({ ...formData, status: value })}
                disabled={isLoading}
              >
                <SelectTrigger className="mt-2 border-[#D8E6F3] focus:border-[#5B8FB9] focus:ring-[#5B8FB9]">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lost">🔍 Lost - I lost this item</SelectItem>
                  <SelectItem value="found">✅ Found - I found this item</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div>
              <Label htmlFor="location" className="text-[#1F2937]">Location *</Label>
              <Input
                id="location"
                required
                placeholder="e.g., Library 2nd Floor, CS Building Room 101"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="mt-2 border-[#D8E6F3] focus:border-[#5B8FB9] focus:ring-[#5B8FB9]"
                disabled={isLoading}
              />
              <p className="text-xs text-[#6B7280] mt-1">
                {formData.location.length}/255 characters (minimum 3)
              </p>
            </div>

            {/* Date */}
            <div>
              <Label htmlFor="date" className="text-[#1F2937]">Date *</Label>
              <Input
                id="date"
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="mt-2 border-[#D8E6F3] focus:border-[#5B8FB9] focus:ring-[#5B8FB9]"
                max={today}
                disabled={isLoading}
              />
              <p className="text-xs text-[#6B7280] mt-1">When was the item lost or found?</p>
            </div>

            {/* Image Upload */}
            <div>
              <Label htmlFor="image" className="text-[#1F2937]">Item Photo (Optional)</Label>
              
              {!imagePreview ? (
                <div className="mt-2">
                  <label 
                    htmlFor="image" 
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#D8E6F3] rounded-lg cursor-pointer bg-[#F8FAFB] hover:bg-[#D8E6F3]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-2 text-[#7FAFD9]" />
                      <p className="mb-1 text-sm text-[#6B7280] text-center">
                        <span className="font-medium">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-[#6B7280]">JPEG, PNG, GIF, or WebP (Max 5MB)</p>
                    </div>
                    <Input
                      id="image"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </label>
                </div>
              ) : (
                <div className="mt-2 relative">
                  <div className="relative rounded-lg overflow-hidden border-2 border-[#D8E6F3]">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors shadow-lg disabled:opacity-50"
                      disabled={isLoading}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-[#6B7280] mt-2 flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    {imageFile?.name} ({(imageFile!.size / 1024).toFixed(0)} KB)
                  </p>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button 
              type="submit"
              size="lg"
              className="w-full bg-[#5B8FB9] hover:bg-[#4A7A9F] text-white py-3 md:py-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed h-12 md:h-14 text-base md:text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </form>
        </Card>

        {/* Info Card */}
        <Card className="mt-6 p-4 bg-[#D8E6F3]/30 border border-[#D8E6F3]">
          <p className="text-sm text-[#1F2937]">
            <strong>Tips for better results:</strong>
          </p>
          <ul className="text-sm text-[#6B7280] mt-2 space-y-1 list-disc list-inside">
            <li>Provide as much detail as possible in the description</li>
            <li>Include unique identifying features or marks</li>
            <li>Upload a clear photo if available</li>
            <li>Be specific about the location and date</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}