"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, Clock, Users, ArrowRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { ActivityStatus } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";

interface Activity {
  id: string;
  title: string;
  description?: string;
  accessKey: string;
  status: ActivityStatus;
  startTime?: string;
  endTime?: string;
  creator: {
    id: string;
    name?: string;
    email: string;
  };
  _count: {
    questions: number;
    participants: number;
    sessions: number;
  };
}

export default function UserActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [otp, setOtp] = useState("");
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const response = await fetch("/api/user/activities");
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch activities",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch activities",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinActivity = async () => {
    if (!otp.trim()) {
      setError("Please enter an access key");
      return;
    }

    setIsJoining(true);
    setError("");

    try {
      const response = await fetch("/api/user/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accessKey: otp }),
      });

      if (response.ok) {
        const activity = await response.json();
        toast({
          title: "Success",
          description: `Successfully joined "${activity.title}"`,
        });
        router.push(`/activity/user/${activity.accessKey}`);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to join activity");
      }
    } catch (error) {
      setError("Failed to join activity");
    } finally {
      setIsJoining(false);
    }
  };

  const getStatusColor = (status: ActivityStatus) => {
    switch (status) {
      case ActivityStatus.ACTIVE:
        return "bg-green-100 text-green-800";
      case ActivityStatus.DRAFT:
        return "bg-yellow-100 text-yellow-800";
      case ActivityStatus.COMPLETED:
        return "bg-blue-100 text-blue-800";
      case ActivityStatus.CANCELLED:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading activities...</span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
        <p className="text-muted-foreground">
          Join quiz activities using your access key
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Join Activity Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Join Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Enter Access Key</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter your access key"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.toUpperCase());
                  setError("");
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleJoinActivity();
                  }
                }}
                disabled={isJoining}
              />
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
            </div>
            <Button onClick={handleJoinActivity} className="w-full" disabled={isJoining}>
              {isJoining ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="ml-2 h-4 w-4" />
              )}
              {isJoining ? "Joining..." : "Join Activity"}
            </Button>
          </CardContent>
        </Card>

        {/* Active Activities Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activities
                .filter(activity => activity.status === ActivityStatus.ACTIVE)
                .map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{activity.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {activity.description}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(activity.startTime)}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {activity._count.participants} participants
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(activity.status)}>
                      {activity.status.toLowerCase()}
                    </Badge>
                  </div>
                ))}
              
              {activities.filter(activity => activity.status === ActivityStatus.ACTIVE).length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No active activities available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* All Activities Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="font-medium">{activity.title}</div>
                    <Badge className={getStatusColor(activity.status)}>
                      {activity.status.toLowerCase()}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {activity.description}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(activity.startTime)} - {formatDate(activity.endTime)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {activity._count.participants} participants
                    </div>
                    <div className="flex items-center gap-1">
                      <Key className="h-3 w-3" />
                      {activity._count.questions} questions
                    </div>
                  </div>
                </div>
                {activity.status === ActivityStatus.ACTIVE && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOtp(activity.accessKey);
                      setSelectedActivity(activity.id);
                    }}
                  >
                    Use Key
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}