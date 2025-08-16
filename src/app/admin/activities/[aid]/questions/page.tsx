"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, ArrowLeft, Key, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { QuestionType, DifficultyLevel } from "@prisma/client";
import { useToast } from "@/hooks/use-toast";

interface Activity {
  id: string;
  title: string;
  description?: string;
  accessKey: string;
  status: string;
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

interface ActivityQuestion {
  id: string;
  activityId: string;
  questionId: string;
  order: number;
  points: number;
  createdAt: string;
  question: {
    id: string;
    title: string;
    content: string;
    type: QuestionType;
    options: string;
    correctAnswer: string;
    explanation?: string;
    difficulty: DifficultyLevel;
    isActive: boolean;
  };
}

export default function ActivityQuestionsPage() {
  const params = useParams();
  const aid = params.aid as string;
  const [activity, setActivity] = useState<Activity | null>(null);
  const [questions, setQuestions] = useState<ActivityQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    type: QuestionType.MULTIPLE_CHOICE,
    options: ["", "", "", ""],
    correctAnswer: "",
    explanation: "",
    difficulty: DifficultyLevel.MEDIUM,
    order: 1,
    points: 1.0,
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchActivity();
    fetchQuestions();
  }, [aid]);

  const fetchActivity = async () => {
    try {
      const response = await fetch(`/api/admin/activities/${aid}`);
      if (response.ok) {
        const data = await response.json();
        setActivity(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch activity",
        variant: "destructive",
      });
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/admin/activities/${aid}/questions`);
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch questions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateQuestion = async () => {
    if (!formData.title || !formData.content) {
      toast({
        title: "Validation Error",
        description: "Question title and content are required",
        variant: "destructive",
      });
      return;
    }

    if (formData.type === QuestionType.MULTIPLE_CHOICE && formData.options.filter(opt => opt.trim() !== "").length < 2) {
      toast({
        title: "Validation Error",
        description: "Multiple choice questions require at least 2 options",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/admin/activities/${aid}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          type: formData.type,
          options: formData.type === QuestionType.MULTIPLE_CHOICE ? formData.options.filter(opt => opt.trim() !== "").join(",") : "",
          correctAnswer: formData.correctAnswer,
          explanation: formData.explanation,
          difficulty: formData.difficulty,
          order: formData.order,
          points: formData.points,
        }),
      });

      if (response.ok) {
        const newQuestion = await response.json();
        setQuestions([...questions, newQuestion]);
        setFormData({
          title: "",
          content: "",
          type: QuestionType.MULTIPLE_CHOICE,
          options: ["", "", "", ""],
          correctAnswer: "",
          explanation: "",
          difficulty: DifficultyLevel.MEDIUM,
          order: questions.length + 1,
          points: 1.0,
        });
        setIsCreateSheetOpen(false);
        toast({
          title: "Success",
          description: "Question added successfully",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to add question",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add question",
        variant: "destructive",
      });
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) {
      return;
    }

    try {
      // Note: You'll need to implement the delete API endpoint for activity questions
      toast({
        title: "Info",
        description: "Delete functionality coming soon",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete question",
        variant: "destructive",
      });
    }
  };

  const getDifficultyColor = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case DifficultyLevel.EASY:
        return "bg-green-100 text-green-800";
      case DifficultyLevel.MEDIUM:
        return "bg-yellow-100 text-yellow-800";
      case DifficultyLevel.HARD:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading questions...</span>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Activity not found</h1>
          <Link href="/admin/activities">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Activities
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/activities">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Activities
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Questions for {activity.title}</h1>
            <p className="text-muted-foreground">
              Access Key: <code className="bg-muted px-2 py-1 rounded text-sm">{activity.accessKey}</code>
            </p>
          </div>
        </div>
        
        <Sheet open={isCreateSheetOpen} onOpenChange={setIsCreateSheetOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[600px]">
            <SheetHeader>
              <SheetTitle>Add New Question</SheetTitle>
              <SheetDescription>
                Create a new question for this activity
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Question Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter question title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="content">Question Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Enter your question"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as QuestionType })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={QuestionType.MULTIPLE_CHOICE}>Multiple Choice</SelectItem>
                      <SelectItem value={QuestionType.TRUE_FALSE}>True/False</SelectItem>
                      <SelectItem value={QuestionType.FILL_IN_BLANK}>Fill in the Blank</SelectItem>
                      <SelectItem value={QuestionType.MULTI_SELECT}>Multi Select</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value as DifficultyLevel })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={DifficultyLevel.EASY}>Easy</SelectItem>
                      <SelectItem value={DifficultyLevel.MEDIUM}>Medium</SelectItem>
                      <SelectItem value={DifficultyLevel.HARD}>Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {(formData.type === QuestionType.MULTIPLE_CHOICE || formData.type === QuestionType.MULTI_SELECT) && (
                <div className="grid gap-2">
                  <Label>Options (comma-separated)</Label>
                  <Textarea
                    value={formData.options.join(", ")}
                    onChange={(e) => setFormData({ ...formData, options: e.target.value.split(",").map(opt => opt.trim()) })}
                    placeholder="Enter options separated by commas"
                  />
                </div>
              )}
              
              <div className="grid gap-2">
                <Label htmlFor="correctAnswer">Correct Answer</Label>
                <Input
                  id="correctAnswer"
                  value={formData.correctAnswer}
                  onChange={(e) => setFormData({ ...formData, correctAnswer: e.target.value })}
                  placeholder="Enter the correct answer"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="explanation">Explanation (Optional)</Label>
                <Textarea
                  id="explanation"
                  value={formData.explanation}
                  onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                  placeholder="Enter explanation for the correct answer"
                />
              </div>
              
              <Button onClick={handleCreateQuestion} className="w-full">
                Add Question
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Questions ({questions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Question</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Options</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((question) => (
                <TableRow key={question.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{question.question.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {question.question.content}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {question.question.type.replace("_", " ").toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getDifficultyColor(question.question.difficulty)}>
                      {question.question.difficulty.toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {question.question.type === QuestionType.MULTIPLE_CHOICE || question.question.type === QuestionType.MULTI_SELECT ? (
                      <div className="flex flex-wrap gap-1">
                        {question.question.options.split(",").map((option, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {option.trim()}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteQuestion(question.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}