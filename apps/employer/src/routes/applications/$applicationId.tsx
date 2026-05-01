import { createFileRoute } from "@tanstack/react-router";
import { ApplicationStatus } from "@/types/application";
import { trpc, queryClient } from "../../utils/trpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@07nghiep/ui/components/avatar";
import { Badge } from "@07nghiep/ui/components/badge";
import { Button } from "@07nghiep/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@07nghiep/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@07nghiep/ui/components/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@07nghiep/ui/components/select";
import { Textarea } from "@07nghiep/ui/components/textarea";
import { Calendar, Download, ExternalLink, Mail, MapPin, Phone, User } from "lucide-react";
import { format } from "date-fns";
import { getStatusColor, getStatusLabel } from "../../components/applications/application-card";
import { toast } from "sonner";
import { useState, useEffect } from "react";


export const Route = createFileRoute("/applications/$applicationId")({
  component: ApplicationDetailPage,
});

function ApplicationDetailPage() {
  const { applicationId } = Route.useParams();
  const { data: application, isLoading } = useQuery(
    trpc.application.get.queryOptions({ id: applicationId })
  );

  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (application?.notes) {
      setNotes(application.notes);
    }
  }, [application?.notes]);

  const updateStatusMutation = useMutation(
    trpc.application.updateStatus.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Application status updated");
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to update status");
      },
    })
  );

  const updateNotesMutation = useMutation(
    trpc.application.updateNotes.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Notes saved successfully");
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to save notes");
      },
    })
  );

  const handleStatusChange = (status: ApplicationStatus) => {
    updateStatusMutation.mutate({
      id: applicationId,
      status,
    });
  };

  const handleSaveNotes = () => {
    updateNotesMutation.mutate({
      id: applicationId,
      notes,
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading application...</div>;
  }

  if (!application) {
    return <div className="p-8 text-center text-muted-foreground">Application not found</div>;
  }

  const profile = application.candidate.profile;

  return (
    <div className="flex flex-col gap-6 p-8 max-w-[1200px] mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-card p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-6">
          <Avatar className="h-20 w-20 ring-4 ring-muted">
            <AvatarImage src={application.candidate.image || undefined} />
            <AvatarFallback className="text-2xl">
              <User className="h-10 w-10 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {application.candidate.name || "Unknown Candidate"}
            </h1>
            <p className="text-muted-foreground font-medium">
              Applied for: <span className="text-foreground">{application.job.title}</span>
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(application.appliedAt), "MMMM d, yyyy")}</span>
              </div>
              <Badge variant="outline" className={getStatusColor(application.status)}>
                {getStatusLabel(application.status)}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <Select value={application.status as any} onValueChange={(val) => handleStatusChange(val as any)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Update Status" />
            </SelectTrigger>
            <SelectContent>
              {(Object.values(ApplicationStatus) as ApplicationStatus[]).map((status) => (
                <SelectItem key={status} value={status}>
                  {getStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none">
              <Mail className="h-4 w-4 mr-2" />
              Message
            </Button>
            {application.resumeUrl && (
              <Button className="flex-1 sm:flex-none" asChild>
                <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Resume
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-12 bg-transparent p-0">
              <TabsTrigger value="profile" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6">
                Candidate Profile
              </TabsTrigger>
              <TabsTrigger value="cover-letter" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6">
                Cover Letter
              </TabsTrigger>
              {application.answers && (
                <TabsTrigger value="questions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6">
                  Screening Questions
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="profile" className="pt-6 outline-none">
              {!profile ? (
                <Card>
                  <CardContent className="p-12 text-center text-muted-foreground flex flex-col items-center">
                    <User className="h-12 w-12 mb-4 opacity-20" />
                    <p>This candidate has not set up their profile yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  {profile.summary && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">About</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground whitespace-pre-wrap">{profile.summary}</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Experience */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Experience</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* Assuming experience is an array of objects. We'll stringify for now since exact structure wasn't provided, but normally we'd map it. */}
                      {profile.experience ? (
                        <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                          {JSON.stringify(profile.experience, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-muted-foreground">No experience listed.</p>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Education */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Education</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {profile.education ? (
                        <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                          {JSON.stringify(profile.education, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-muted-foreground">No education listed.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="cover-letter" className="pt-6 outline-none">
              <Card>
                <CardContent className="p-8">
                  {application.coverLetter ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                      {application.coverLetter}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No cover letter provided.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            {!!(application as any).answers && (
              <TabsContent value="questions" className="pt-6 outline-none">
                <Card>
                  <CardContent className="p-6">
                    <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                      {JSON.stringify(application.answers, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${application.candidate.email}`} className="hover:text-primary hover:underline">
                  {application.candidate.email}
                </a>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${profile.phone}`} className="hover:text-primary hover:underline">
                    {profile.phone}
                  </a>
                </div>
              )}
              {profile?.location && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.location}</span>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Links */}
          {(profile?.portfolioUrl || profile?.resumeUrl || application.resumeUrl) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Links & Files</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {application.resumeUrl && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Application Resume
                    </a>
                  </Button>
                )}
                {profile?.resumeUrl && profile.resumeUrl !== application.resumeUrl && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Profile Resume
                    </a>
                  </Button>
                )}
                {profile?.portfolioUrl && (
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Portfolio / Website
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Employer Notes */}
          <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10">
            <CardHeader>
              <CardTitle className="text-lg text-amber-900 dark:text-amber-500">Employer Notes (Private)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="Add notes about this candidate... Only visible to your team."
                className="min-h-[150px] bg-background resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white" 
                onClick={handleSaveNotes}
                disabled={notes === application.notes || updateNotesMutation.isPending}
              >
                {updateNotesMutation.isPending ? "Saving..." : "Save Notes"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
