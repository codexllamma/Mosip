"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Building2, MapPin, FileBadge, Truck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

export function Profile() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  // Consistent Styling Classes
  const inputClass = "h-11 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500 transition-all duration-200 shadow-sm";
  const labelClass = "text-slate-700 font-medium mb-1.5 block flex items-center gap-2";
  
  useEffect(() => {
    if (session?.user?.email) {
      fetch(`/api/profile?email=${session.user.email}`)
        .then(res => res.json())
        .then(data => {
          setIsComplete(data.isComplete);
          if (data.profile) setFormData(data.profile);
          setLoading(false);
        });
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session?.user?.email,
          role: session?.user?.role,
          data: formData
        })
      });

      if (!res.ok) throw new Error("Failed to update profile");

      toast({
        title: "Profile Updated",
        description: "Your details have been saved successfully.",
        className: "bg-emerald-50 border-emerald-200 text-emerald-800"
      });
      setIsComplete(true);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save profile.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const toggleTest = (testName: string) => {
    const currentTests = formData.testsAvailable || {};
    const newTests = { ...currentTests, [testName]: !currentTests[testName] };
    setFormData((prev: any) => ({ ...prev, testsAvailable: newTests }));
  };

  if (!session) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Account Settings</h1>
        <p className="text-slate-500">Manage your organization profile and registry details.</p>
      </div>

      {/* Status Banner */}
      {!loading && (
        <Alert variant={isComplete ? "default" : "destructive"} className={`border shadow-sm ${isComplete ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}>
          {isComplete ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-red-600" />}
          <AlertTitle className={`text-base font-semibold ${isComplete ? "text-emerald-800" : "text-red-800"}`}>
            {isComplete ? "Profile Active" : "Action Required"}
          </AlertTitle>
          <AlertDescription className={isComplete ? "text-emerald-700" : "text-red-700"}>
            {isComplete 
              ? "Your profile is verified and active on the network. You can perform operations." 
              : "Your profile is incomplete. Please fill in the details below to access platform features."}
          </AlertDescription>
        </Alert>
      )}

      <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm overflow-hidden ring-1 ring-slate-200">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Building2 className="h-6 w-6 text-emerald-700" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">Organization Details</CardTitle>
              <CardDescription className="text-slate-500">Official registry information visible on certificates.</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* === FORM FOR QA AGENCY === */}
            {session.user.role === 'QA_AGENCY' && (
              <>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Location & Capacity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <Label className={labelClass}><MapPin className="h-4 w-4" /> Official Address</Label>
                      <Input 
                        value={formData.address || ''} 
                        onChange={e => handleInputChange('address', e.target.value)} 
                        placeholder="123 Lab Street, City" 
                        required 
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className={labelClass}>Pincode (For Matching)</Label>
                      <Input 
                        value={formData.pinCode || ''} 
                        onChange={e => handleInputChange('pinCode', e.target.value)} 
                        placeholder="400001" 
                        required 
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <Label className={labelClass}>Daily Inspection Capacity (Batches)</Label>
                      <Input 
                        type="number"
                        value={formData.maxCapacity || ''} 
                        onChange={e => handleInputChange('maxCapacity', e.target.value)} 
                        placeholder="e.g. 50" 
                        required 
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Capabilities</h3>
                  <div className="space-y-3">
                    <Label className="text-slate-700 font-medium">Available Tests / Certifications</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {['Moisture Content', 'Pesticide Residue', 'Organic Certified', 'Heavy Metals', 'Grade A Quality', 'Aflatoxin Level'].map((test) => (
                        <div key={test} className={`flex items-center space-x-3 p-3 rounded-lg border transition-all ${formData.testsAvailable?.[test] ? 'border-emerald-500 bg-emerald-50/50' : 'border-slate-200 hover:bg-slate-50'}`}>
                          <Checkbox 
                            id={test} 
                            checked={formData.testsAvailable?.[test] || false}
                            onCheckedChange={() => toggleTest(test)}
                            className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                          />
                          <label htmlFor={test} className="text-sm font-medium leading-none cursor-pointer text-slate-700">
                            {test}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* === FORM FOR EXPORTER === */}
            {session.user.role === 'EXPORTER' && (
              <>
                 <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Business Identity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <Label className={labelClass}><FileBadge className="h-4 w-4" /> IEC Number</Label>
                      <Input 
                        value={formData.iecNum || ''} 
                        onChange={e => handleInputChange('iecNum', e.target.value)} 
                        placeholder="10-digit Import Export Code" 
                        required 
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className={labelClass}>Company PAN</Label>
                      <Input 
                        value={formData.panNum || ''} 
                        onChange={e => handleInputChange('panNum', e.target.value)} 
                        placeholder="ABCDE1234F" 
                        required 
                        className={inputClass}
                      />
                    </div>
                     <div className="space-y-1">
                      <Label className={labelClass}>GST Number</Label>
                      <Input 
                        value={formData.gstNum || ''} 
                        onChange={e => handleInputChange('gstNum', e.target.value)} 
                        placeholder="22AAAAA0000A1Z5"
                        required 
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className={labelClass}>Contact Phone</Label>
                      <Input 
                        value={formData.phoneNum || ''} 
                        onChange={e => handleInputChange('phoneNum', e.target.value)} 
                        placeholder="+91 98765 43210"
                        required 
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">Registered Office</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1 md:col-span-2">
                      <Label className={labelClass}>Street Address</Label>
                      <Input 
                        value={formData.address || ''} 
                        onChange={e => handleInputChange('address', e.target.value)} 
                        placeholder="Office No, Building Name, Street"
                        required 
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className={labelClass}>City</Label>
                      <Input 
                        value={formData.city || ''} 
                        onChange={e => handleInputChange('city', e.target.value)} 
                        required 
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className={labelClass}>Country</Label>
                      <Input 
                        value={formData.country || 'India'} 
                        onChange={e => handleInputChange('country', e.target.value)} 
                        required 
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="pt-4 flex justify-end">
              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full md:w-auto px-8 h-12 text-base font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-100 transition-all active:scale-[0.98] rounded-xl"
              >
                {loading ? "Saving Changes..." : "Save Profile Details"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}