
"use client";

import { AppLayout } from "@/components/layout/app-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Edit3, Save, UserCircle, ShieldCheck, Mail, Loader2, Bell, Lock, Trash2, KeyRound, CheckCircle, Database, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, 
} from "@/components/ui/alert-dialog";

import { useRouter } from "next/navigation";


interface NotificationPreferences {
  emailWeeklySummary: boolean;
  budgetAlertsPush: boolean;
}

const profileFaqs = [
  {
    question: "How can I change my display name?",
    answer: "If you are logged in with an account, click the 'Edit Profile' button. This will make the display name field editable. Enter your new name and click 'Save Changes'. This is not available in Guest Mode.",
  },
  {
    question: "Can I change my email address?",
    answer: "Your email address is used as your primary identifier for your account and cannot be changed directly through the profile page. This setting is not applicable for Guest Mode.",
  },
  {
    question: "How do I change my password?",
    answer: "If logged in, under 'Account Settings', click 'Change Password'. A dialog will appear prompting you for your new password and confirmation. This is not available in Guest Mode.",
  },
  {
    question: "What are notification preferences?",
    answer: "You can manage how R3ZA communicates with you. 'Email Weekly Summary' (conceptual) would send you a financial overview. 'Budget Alerts (In-Browser)' (conceptual) would provide browser notifications if you're nearing budget limits. These settings are saved locally in your browser for both registered users and guests.",
  },
  {
    question: "How do I delete my account?",
    answer: "If logged in, under 'Account Settings', click 'Delete Account'. You'll be asked to confirm this action as it is permanent and will erase all your data from R3ZA. This action is not applicable in Guest Mode as data is only local.",
  },
  {
    question: "What is the 'Member Access' / 'Guest Access' card?",
    answer: "This card shows your current access level. If you're a registered user, it confirms 'Member Access' to all features with cloud-saved data. In 'Guest Access', it reminds you that data is stored locally in your browser."
  }
];

export default function ProfilePage() {
  const { user, loading: authLoading, isGuest, updateCurrentUserProfile, updateUserPassword, deleteCurrentUserAccount, reauthenticateUser, signOut } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(""); 
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPasswordForReauth, setCurrentPasswordForReauth] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [actionRequiringReauth, setActionRequiringReauth] = useState<(() => Promise<void>) | null>(null);
  const [isReauthDialogOpen, setIsReauthDialogOpen] = useState(false);

  const [isNotificationPrefsOpen, setIsNotificationPrefsOpen] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    emailWeeklySummary: false,
    budgetAlertsPush: false,
  });
  const [isNotificationPrefsSubmitting, setIsNotificationPrefsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || "");
      // Use a generic key or user-specific if not guest, for notification prefs
      const storageKey = isGuest ? `r3za-notifications-guest` : `r3za-notifications-${user.uid}`;
      const savedPrefs = localStorage.getItem(storageKey);
      if (savedPrefs) {
        setNotificationPrefs(JSON.parse(savedPrefs));
      }
    }
  }, [user, isGuest]);

  const handleProfileUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (isGuest || !user || !updateCurrentUserProfile) return;
    setIsProfileSubmitting(true);
    try {
      await updateCurrentUserProfile({ 
        displayName: displayName,
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error("Profile update failed on page:", error);
      // Toast is handled within updateCurrentUserProfile
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (user) {
      setDisplayName(user.displayName || "");
    }
  };

  const attemptPasswordChange = async () => {
    if (isGuest) return;
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Passwords Mismatch", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsPasswordSubmitting(true);
    try {
      await updateUserPassword(newPassword); 
      setIsPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setActionRequiringReauth(() => () => updateUserPassword(newPassword));
        setIsPasswordDialogOpen(false); 
        setIsReauthDialogOpen(true);     
      }
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const attemptAccountDeletion = async () => {
    if (isGuest) return;
    setIsProfileSubmitting(true); 
    try {
      await deleteCurrentUserAccount(); 
    } catch (error: any) {
       if (error.code === 'auth/requires-recent-login') {
        setActionRequiringReauth(() => deleteCurrentUserAccount);
        setIsReauthDialogOpen(true);
      }
    } finally {
      setIsProfileSubmitting(false);
    }
  };
  
  const handleReauthentication = async () => {
    if (isGuest || !currentPasswordForReauth || !actionRequiringReauth || !reauthenticateUser) return;
    setIsPasswordSubmitting(true); 
    try {
      await reauthenticateUser(currentPasswordForReauth);
      setIsReauthDialogOpen(false);
      setCurrentPasswordForReauth("");
      await actionRequiringReauth(); 
      setActionRequiringReauth(null);
    } catch (error) {
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  const handleBudgetAlertsToggle = async (checked: boolean) => {
    if (checked) {
      if (typeof Notification !== "undefined") {
        if (Notification.permission === "granted") {
          setNotificationPrefs(p => ({ ...p, budgetAlertsPush: true }));
        } else if (Notification.permission === "denied") {
          toast({ title: "Notifications Blocked", description: "Please enable notifications in your browser settings.", variant: "destructive" });
          setNotificationPrefs(p => ({ ...p, budgetAlertsPush: false })); 
        } else { 
          try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
              setNotificationPrefs(p => ({ ...p, budgetAlertsPush: true }));
              toast({ title: "Notifications Enabled", description: "You will now receive budget alerts." });
            } else {
              toast({ title: "Notifications Denied", description: "You won't receive budget alerts.", variant: "destructive" });
              setNotificationPrefs(p => ({ ...p, budgetAlertsPush: false })); 
            }
          } catch (error) {
            console.error("Error requesting notification permission:", error);
            toast({ title: "Permission Error", description: "Could not request notification permission.", variant: "destructive" });
            setNotificationPrefs(p => ({ ...p, budgetAlertsPush: false })); 
          }
        }
      } else {
        toast({ title: "Notifications Not Supported", description: "Your browser does not support notifications.", variant: "destructive" });
        setNotificationPrefs(p => ({ ...p, budgetAlertsPush: false })); 
      }
    } else {
      setNotificationPrefs(p => ({ ...p, budgetAlertsPush: false }));
    }
  };

  const handleSaveNotificationPrefs = () => {
    const storageKey = isGuest ? `r3za-notifications-guest` : `r3za-notifications-${user?.uid}`;
    setIsNotificationPrefsSubmitting(true);
    try {
      localStorage.setItem(storageKey, JSON.stringify(notificationPrefs));
      toast({ title: "Preferences Saved", description: "Your notification settings have been updated." });
      setIsNotificationPrefsOpen(false);
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      toast({ title: "Save Error", description: "Could not save notification preferences.", variant: "destructive" });
    } finally {
      setIsNotificationPrefsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-[calc(100vh-150px)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!user) { // This should ideally not happen if AppLayout handles redirects
    router.push("/login");
    return (
      <AppLayout>
        <p className="text-center">Redirecting to login...</p>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold font-headline tracking-tight">My Profile</h1>
          {!isEditing && !isGuest && (
            <Button onClick={() => setIsEditing(true)} variant="outline" className="rounded-full shadow-sm hover:shadow-md transition-shadow">
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="md:col-span-2 shadow-xl rounded-xl animate-fade-in">
            <form onSubmit={handleProfileUpdate}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                   <div className="relative group">
                    <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-2 border-primary shadow-md">
                      {user.photoURL ? (
                        <AvatarImage src={user.photoURL} alt={user.displayName || "User"} key={user.photoURL} />
                      ) : null}
                      <AvatarFallback className="text-3xl bg-muted">
                        {isGuest ? 'G' : (user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle className="h-12 w-12"/>)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-semibold">{isEditing && !isGuest ? "Edit Your Details" : (user.displayName || "User Profile")}</CardTitle>
                    <CardDescription>{isGuest ? "You are in Guest Mode." : "Manage your personal information and preferences."}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="displayName">Display Name</Label>
                  {isEditing && !isGuest ? (
                    <Input 
                      id="displayName" 
                      value={displayName} 
                      onChange={(e) => setDisplayName(e.target.value)} 
                      className="rounded-full focus:ring-primary focus:border-primary"
                      disabled={isProfileSubmitting}
                      placeholder="Your display name"
                    />
                  ) : (
                    <p className="text-lg font-medium mt-1">{user.displayName || "Not set"}</p>
                  )}
                </div>
                {!isGuest && user.email && (
                    <div>
                    <Label htmlFor="email">Email Address</Label>
                    <div className="flex items-center gap-2 mt-1">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <p className="text-lg text-muted-foreground">{user.email}</p>
                        <Badge variant="outline" className="rounded-full border-green-500 text-green-600 bg-green-50 dark:bg-green-900/50 dark:text-green-400">
                            <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                        </Badge>
                    </div>
                    </div>
                )}
                {isGuest && (
                    <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-accent/10">
                        <p>You are currently in Guest Mode. Your data is stored locally in this browser.</p>
                        <Button asChild variant="link" className="p-0 h-auto text-primary">
                            <Link href="/signup">Sign up for a free account</Link>
                        </Button> to save your data permanently.
                    </div>
                )}
              </CardContent>
              {isEditing && !isGuest && (
                <CardFooter className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCancelEdit} className="rounded-full" disabled={isProfileSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isProfileSubmitting} className="rounded-full shadow-md hover:shadow-lg transition-shadow">
                    {isProfileSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                  </Button>
                </CardFooter>
              )}
            </form>
          </Card>

          <Card className="md:col-span-1 shadow-xl rounded-xl overflow-hidden group animate-fade-in" style={{animationDelay: '0.1s'}}>
            <div className={`relative aspect-[5/3] bg-gradient-to-br ${isGuest ? 'from-accent via-slate-500 to-slate-600' : 'from-primary via-purple-600 to-accent'} p-6 flex flex-col justify-between text-primary-foreground`}>
              <div className="absolute inset-0 animate-vip-pass-shimmer bg-repeat-x"
                   style={{ backgroundImage: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)', backgroundSize: '2000px 100%' }} />
              <div>
                <h3 className="text-2xl font-bold font-headline tracking-tight flex items-center">
                  {isGuest ? <Database className="mr-2 h-7 w-7"/> : <CheckCircle className="mr-2 h-7 w-7"/>}
                  {isGuest ? "Guest Access" : "Member Access"}
                </h3>
                <p className="text-xs opacity-80">
                  {isGuest ? "Local browser storage enabled." : "Full access to all FinanceFlow features."}
                </p>
              </div>
              <div className="z-10">
                <p className="text-sm opacity-90">Account Holder</p>
                <p className="text-lg font-semibold truncate group-hover:animate-subtle-pulse">{user.displayName || user.email}</p>
              </div>
              <div className="absolute bottom-4 right-4 text-xs opacity-70">
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="inline -mt-0.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
                  </svg> FinanceFlow
              </div>
              <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(45deg,_hsla(0,0%,100%,1)_25%,_transparent_25%),_linear-gradient(-45deg,_hsla(0,0%,100%,1)_25%,_transparent_25%),_linear-gradient(45deg,_transparent_75%,_hsla(0,0%,100%,1)_75%),_linear-gradient(-45deg,_transparent_75%,_hsla(0,0%,100%,1)_75%)] bg-[length:_20px_20px] [background-position:_0_0,_0_10px,_10px_-10px,_-10px_0px]"></div>
            </div>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">
                {isGuest 
                    ? "You're exploring FinanceFlow in guest mode. Your data is saved in this browser only."
                    : "You have access to all features including AI insights, advanced budgeting, and cloud-saved data as a registered member!"
                }
                 {isGuest && (
                    <Button variant="link" className="p-0 h-auto text-primary text-sm block mt-1" onClick={() => { signOut().then(() => router.push('/signup')); }}>
                        Sign up to save data permanently <UserPlus className="ml-1 h-3 w-3" />
                    </Button>
                 )}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl animate-fade-in" style={{animationDelay: '0.2s'}}>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Manage your preferences {isGuest ? '(local settings)' : 'and security options'}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Dialog open={isNotificationPrefsOpen} onOpenChange={setIsNotificationPrefsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start rounded-full text-left">
                  <Bell className="mr-2 h-4 w-4" /> Notification Preferences
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md rounded-lg">
                <DialogHeader>
                  <DialogTitle>Notification Preferences</DialogTitle>
                  <DialogDescription>Choose how you want to be notified. (Settings saved locally)</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center justify-between space-x-2 p-2 rounded-md border">
                    <Label htmlFor="emailSummary" className="flex flex-col space-y-1">
                      <span>Email Weekly Summary</span>
                      <span className="font-normal leading-snug text-muted-foreground text-xs">
                        Receive a summary of your finances every week. (Conceptual)
                      </span>
                    </Label>
                    <Switch
                      id="emailSummary"
                      checked={notificationPrefs.emailWeeklySummary}
                      onCheckedChange={(checked) => setNotificationPrefs(p => ({...p, emailWeeklySummary: checked}))}
                      disabled={isNotificationPrefsSubmitting || isGuest}
                      title={isGuest ? "Sign up to enable email notifications" : ""}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2 p-2 rounded-md border">
                    <Label htmlFor="budgetAlerts" className="flex flex-col space-y-1">
                      <span>Budget Alerts (In-Browser)</span>
                       <span className="font-normal leading-snug text-muted-foreground text-xs">
                        Get browser notifications when nearing a budget limit. (Conceptual)
                      </span>
                    </Label>
                    <Switch
                      id="budgetAlerts"
                      checked={notificationPrefs.budgetAlertsPush}
                      onCheckedChange={handleBudgetAlertsToggle}
                      disabled={isNotificationPrefsSubmitting}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild><Button variant="outline" className="rounded-full" disabled={isNotificationPrefsSubmitting}>Cancel</Button></DialogClose>
                  <Button onClick={handleSaveNotificationPrefs} className="rounded-full" disabled={isNotificationPrefsSubmitting}>
                    {isNotificationPrefsSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                    Save Preferences
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {!isGuest && (
              <>
                <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => { if(!open) { setNewPassword(''); setConfirmNewPassword('');} setIsPasswordDialogOpen(open);}}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start rounded-full text-left">
                      <KeyRound className="mr-2 h-4 w-4" /> Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-lg">
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>Enter a new password for your account.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="rounded-full" disabled={isPasswordSubmitting} />
                      </div>
                      <div>
                        <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                        <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} className="rounded-full" disabled={isPasswordSubmitting} />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button variant="outline" className="rounded-full" disabled={isPasswordSubmitting}>Cancel</Button></DialogClose>
                      <Button onClick={attemptPasswordChange} className="rounded-full" disabled={isPasswordSubmitting}>
                        {isPasswordSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        Update Password
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start rounded-full text-left">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your account and all associated data from FinanceFlow.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={attemptAccountDeletion} className="rounded-full bg-destructive hover:bg-destructive/90" disabled={isProfileSubmitting}>
                        {isProfileSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </CardContent>
        </Card>

      </div>

      {!isGuest && (
        <Dialog open={isReauthDialogOpen} onOpenChange={(open) => {if (!open) {setActionRequiringReauth(null); setCurrentPasswordForReauth("");} setIsReauthDialogOpen(open);}}>
            <DialogContent className="sm:max-w-md rounded-lg">
            <DialogHeader>
                <DialogTitle>Re-authentication Required</DialogTitle>
                <DialogDescription>
                For your security, please enter your current password to continue.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div>
                <Label htmlFor="currentPasswordReauth">Current Password</Label>
                <Input 
                    id="currentPasswordReauth" 
                    type="password" 
                    value={currentPasswordForReauth} 
                    onChange={(e) => setCurrentPasswordForReauth(e.target.value)} 
                    className="rounded-full"
                    disabled={isPasswordSubmitting}
                />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => {setIsReauthDialogOpen(false); setActionRequiringReauth(null); setCurrentPasswordForReauth("");}} className="rounded-full" disabled={isPasswordSubmitting}>Cancel</Button>
                <Button onClick={handleReauthentication} className="rounded-full" disabled={isPasswordSubmitting || !currentPasswordForReauth}>
                {isPasswordSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4"/>}
                Re-authenticate
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}
