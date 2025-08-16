"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Maximize, Moon, Sun, Users, Clock, Key, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { ActivityStatus, SessionStatus } from "@prisma/client";
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

interface Participant {
  id: string;
  userId: string;
  activityId: string;
  joinedAt: string;
  score?: number;
  rank?: number;
  user: {
    id: string;
    name?: string;
    email: string;
    avatar?: string;
  };
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

interface Session {
  id: string;
  activityId: string;
  currentQuestion?: number;
  status: SessionStatus;
  startTime?: string;
  endTime?: string;
  createdAt: string;
  updatedAt: string;
}

const colors = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500",
];

export default function ActivityAdminPage() {
  const params = useParams();
  const key = params.key as string;
  const { theme, setTheme } = useTheme();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quizStarted, setQuizStarted] = useState(false);
  const [timer, setTimer] = useState(10);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchActivity();
    fetchParticipants();
    fetchSession();
  }, [key]);

  useEffect(() => {
    if (!quizStarted || timer <= 0) return;

    const interval = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) {
          setShowResults(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quizStarted, timer]);

  const fetchActivity = async () => {
    try {
      // For now, we'll use a mock activity since we need to create the activity first
      setActivity({
        id: "1",
        title: "Math Quiz 2024",
        description: "Annual mathematics competition for high school students",
        accessKey: key.toUpperCase(),
        status: ActivityStatus.ACTIVE,
        creator: {
          id: "1",
          name: "Admin User",
          email: "admin@demo.com",
        },
        _count: {
          questions: 5,
          participants: participants.length,
          sessions: 1,
        },
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch activity",
        variant: "destructive",
      });
    }
  };

  const fetchParticipants = async () => {
    try {
      const response = await fetch(`/api/activity/${key}/participants`);
      if (response.ok) {
        const data = await response.json();
        const participantsWithAnimation = data.map((p: any, index: number) => ({
          ...p,
          x: Math.random() * 80 + 10,
          y: Math.random() * 60 + 20,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 20 + 40,
          color: colors[index % colors.length],
        }));
        setParticipants(participantsWithAnimation);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch participants",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/activity/${key}/session`);
      if (response.ok) {
        const data = await response.json();
        setSession(data);
        if (data.status === SessionStatus.PLAYING) {
          setQuizStarted(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch session:", error);
    }
  };

  // Animation loop for bubble movement
  useEffect(() => {
    if (quizStarted) return;

    const animate = () => {
      setParticipants(prev => 
        prev.map(p => {
          let newX = p.x + p.vx;
          let newY = p.y + p.vy;
          let newVx = p.vx;
          let newVy = p.vy;

          // Bounce off walls
          if (newX <= 5 || newX >= 95) newVx = -newVx;
          if (newY <= 5 || newY >= 95) newVy = -newVy;

          // Keep within bounds
          newX = Math.max(5, Math.min(95, newX));
          newY = Math.max(5, Math.min(95, newY));

          return {
            ...p,
            x: newX,
            y: newY,
            vx: newVx,
            vy: newVy,
          };
        })
      );
    };

    const animationId = requestAnimationFrame(function frame() {
      animate();
      requestAnimationFrame(frame);
    });

    return () => cancelAnimationFrame(animationId);
  }, [quizStarted]);

  const handleStartQuiz = async () => {
    try {
      const response = await fetch(`/api/activity/${key}/session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "start" }),
      });

      if (response.ok) {
        const newSession = await response.json();
        setSession(newSession);
        setQuizStarted(true);
        setTimer(10);
        toast({
          title: "Success",
          description: "Quiz started successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to start quiz",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start quiz",
        variant: "destructive",
      });
    }
  };

  const handleNextQuestion = () => {
    setShowResults(false);
    setTimer(10);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading activity...</span>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Activity not found</h1>
          <p className="text-muted-foreground mb-4">Please check the access key and try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 relative overflow-hidden">
      {/* Top controls */}
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" onClick={toggleFullscreen}>
          <Maximize className="mr-2 h-4 w-4" />
          Fullscreen
        </Button>
        <Button variant="outline" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
          {theme === "light" ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />}
          {theme === "light" ? "Dark" : "Light"}
        </Button>
      </div>

      {/* Activity info */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">{activity.title}</h1>
              <p className="text-muted-foreground">{activity.description}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Key className="h-4 w-4" />
                  <code className="bg-muted px-2 py-1 rounded text-sm">
                    {activity.accessKey}
                  </code>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{participants.length} participants</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{activity._count.questions} questions</span>
                </div>
              </div>
            </div>
            <Badge className="bg-green-100 text-green-800">
              {activity.status.toLowerCase()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Main content area */}
      <div className="relative h-[500px] bg-muted/30 rounded-lg overflow-hidden">
        {!quizStarted ? (
          // Lobby view - animated bubbles
          <div className="relative w-full h-full">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className={`absolute rounded-full ${participant.color} text-white font-bold flex items-center justify-center shadow-lg transition-all duration-1000 ease-in-out`}
                style={{
                  left: `${participant.x}%`,
                  top: `${participant.y}%`,
                  width: `${participant.size}px`,
                  height: `${participant.size}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <span className="text-lg">{getInitials(participant.user?.name)}</span>
              </div>
            ))}
          </div>
        ) : showResults ? (
          // Results view - leaderboard
          <div className="p-6 h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4">Question Results</h2>
            <div className="flex-1 space-y-2">
              {participants.slice(0, 5).map((participant, index) => (
                <div
                  key={participant.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index < 3 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50' : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-400' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-400' : 'bg-muted'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{participant.user?.name || "Anonymous"}</div>
                      <div className="text-sm text-muted-foreground">
                        {(participant.score || 0)} points
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{participant.score || 0}</div>
                    <div className="text-sm text-muted-foreground">points</div>
                  </div>
                </div>
              ))}
            </div>
            <Button onClick={handleNextQuestion} className="w-full mt-4">
              Next Question
            </Button>
          </div>
        ) : (
          // Timer view
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-8xl font-bold mb-4">{timer}</div>
              <p className="text-xl text-muted-foreground">Collecting answers...</p>
            </div>
          </div>
        )}
      </div>

      {/* Start button */}
      {!quizStarted && (
        <div className="flex justify-center mt-6">
          <Button onClick={handleStartQuiz} size="lg" className="px-8">
            <Play className="mr-2 h-5 w-5" />
            Start Quiz
          </Button>
        </div>
      )}
    </div>
  );
}