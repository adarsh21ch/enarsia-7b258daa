import { useState } from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  ChevronRight,
  Rocket,
  Phone,
  List,
  BarChart3,
  Calendar,
  CheckSquare,
  Tags,
  Users,
  Lightbulb,
  FileSpreadsheet,
  Search,
  Filter,
  Plus,
  Play,
  X,
  ExternalLink,
  LayoutDashboard,
  Sparkles,
  Clock,
  Target,
  FolderOpen,
  Zap,
  Eye,
  Settings2,
  Trash2,
  Link,
  ArrowRight,
} from 'lucide-react';

// ============ Helper Components ============

interface VideoEmbedProps {
  url: string;
  title: string;
}

function VideoEmbed({ url, title }: VideoEmbedProps) {
  const [loaded, setLoaded] = useState(false);

  // Convert YouTube watch URLs to embed URLs
  const getEmbedUrl = (inputUrl: string) => {
    if (inputUrl.includes('youtube.com/watch')) {
      const videoId = inputUrl.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (inputUrl.includes('youtu.be/')) {
      const videoId = inputUrl.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    return inputUrl;
  };

  return (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted my-3">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Skeleton className="w-full h-full" />
          <Play className="absolute h-12 w-12 text-muted-foreground/50" />
        </div>
      )}
      <iframe
        src={getEmbedUrl(url)}
        title={title}
        className={cn("w-full h-full", !loaded && "opacity-0")}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

interface GifDemoProps {
  src: string;
  alt: string;
}

function GifDemo({ src, alt }: GifDemoProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="aspect-video rounded-lg bg-muted flex items-center justify-center my-3">
        <p className="text-sm text-muted-foreground">Demo coming soon</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border bg-muted my-3">
      {!loaded && <Skeleton className="aspect-video w-full" />}
      <img
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={cn("w-full h-auto", !loaded && "hidden")}
      />
    </div>
  );
}

// Feature highlight chips with icons (compact visual representation)
interface FeatureHighlightProps {
  features: { icon: React.ElementType; label: string }[];
}

function FeatureHighlight({ features }: FeatureHighlightProps) {
  return (
    <div className="flex flex-wrap gap-2 my-2">
      {features.map((feature, index) => {
        const Icon = feature.icon;
        return (
          <div key={index} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <Icon className="h-3.5 w-3.5" />
            <span>{feature.label}</span>
          </div>
        );
      })}
    </div>
  );
}

interface StepListProps {
  steps: string[];
}

function StepList({ steps }: StepListProps) {
  return (
    <ol className="list-none space-y-2 my-3 pl-0">
      {steps.map((step, index) => (
        <li key={index} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
            {index + 1}
          </span>
          <span className="text-sm text-muted-foreground pt-0.5">{step}</span>
        </li>
      ))}
    </ol>
  );
}

interface TipBoxProps {
  children: React.ReactNode;
}

function TipBox({ children }: TipBoxProps) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-accent/50 border border-accent my-3">
      <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

// Link component for external links
interface ExternalLinkButtonProps {
  href: string;
  children: React.ReactNode;
}

function ExternalLinkButton({ href, children }: ExternalLinkButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-primary underline underline-offset-2 hover:text-primary/80 text-sm font-medium transition-colors"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

// ============ Guide Content ============

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Rocket,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Welcome to the app! This guide will help you get started with managing your leads and tracking your progress.
        </p>
        <FeatureHighlight features={[
          { icon: Phone, label: 'Follow Up' },
          { icon: List, label: 'ListUp' },
          { icon: BarChart3, label: 'Tracking' },
          { icon: CheckSquare, label: 'TodoUp' },
        ]} />
        <h4 className="font-medium text-sm">First Steps</h4>
        <StepList
          steps={[
            'Add your first lead using the + button in Follow Up tab',
            'Set up your tracking tags in Profile → Tracking Format',
            'Connect with your upline leader (optional) to sync team tags',
            'Start tracking your daily activities',
          ]}
        />
        <TipBox>
          New users get default tracking tags: "Not picked", "Video send", "Enrolment" for leads, and "Day1", "Day2", "Day3" for funnel stages. You can customize these anytime!
        </TipBox>
      </div>
    ),
  },
  {
    id: 'follow-up-tab',
    title: 'Follow Up Tab',
    icon: Phone,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          The Follow Up tab is your main workspace for managing leads and tracking call responses.
        </p>
        <FeatureHighlight features={[
          { icon: Plus, label: 'Add Lead' },
          { icon: Search, label: 'Search' },
          { icon: Filter, label: 'Filter' },
          { icon: FileSpreadsheet, label: 'Import Excel' },
        ]} />
        
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" /> Adding a New Lead
        </h4>
        <StepList
          steps={[
            'Tap the + button at the bottom right',
            'Enter the lead\'s name and phone number',
            'Optionally add notes, profession, or other details',
            'Select a response tag after your call',
            'Tap Save to add the lead',
          ]}
        />
        

        <h4 className="font-medium text-sm flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4" /> Importing from Excel
        </h4>
        <p className="text-sm text-muted-foreground">
          Have existing leads in a spreadsheet? Import them in bulk!
        </p>
        <StepList
          steps={[
            'Tap the + button → select "Import Excel"',
            'Choose your Excel or CSV file',
            'Map your columns (Name, Phone, etc.)',
            'Review the preview and tap Import',
            'Your leads will be added with original order preserved',
          ]}
        />
        
        <TipBox>
          Make sure your Excel file has at least Name and Phone columns. The app will try to auto-detect column mappings.
        </TipBox>

        <h4 className="font-medium text-sm flex items-center gap-2">
          <Search className="h-4 w-4" /> Search & Filter
        </h4>
        <StepList
          steps={[
            'Use the search bar to find leads by name, phone, or notes',
            'Tap the filter icon to filter by response tags',
            'Combine multiple filters to narrow down your list',
            'Clear filters to see all leads again',
          ]}
        />
        
      </div>
    ),
  },
  {
    id: 'listup-tab',
    title: 'ListUp Tab',
    icon: List,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          ListUp gives you a quick view of your leads organized by response tags. Perfect for quick follow-ups!
        </p>
        <FeatureHighlight features={[
          { icon: Tags, label: 'By Tags' },
          { icon: Phone, label: 'Quick Call' },
          { icon: ArrowRight, label: 'Swipe Actions' },
        ]} />
        <h4 className="font-medium text-sm">How to Use</h4>
        <StepList
          steps={[
            'Tap on any response tag to see leads with that status',
            'Use the quick-call button to dial directly',
            'Tap WhatsApp icon to message on WhatsApp',
            'Swipe or tap to update lead status',
          ]}
        />
        <TipBox>
          ListUp is great for morning routines - quickly see who needs a follow-up call today!
        </TipBox>
      </div>
    ),
  },
  {
    id: 'trackup-tab',
    title: 'Tracking Tab',
    icon: BarChart3,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Track your progress with visual analytics and see how your leads move through the funnel.
        </p>
        <FeatureHighlight features={[
          { icon: BarChart3, label: 'Analytics' },
          { icon: Target, label: 'Funnel' },
          { icon: Clock, label: 'Daily Stats' },
        ]} />
        
        <h4 className="font-medium text-sm">Leads Tracker</h4>
        <p className="text-sm text-muted-foreground">
          Shows daily counts for each response tag. See how many leads you've added, called, and converted each day.
        </p>

        <h4 className="font-medium text-sm">Funnel Tracker</h4>
        <p className="text-sm text-muted-foreground">
          Tracks leads through your funnel stages (Day1, Day2, Day3, etc.). See conversion rates and identify drop-off points.
        </p>

        <TipBox>
          Check your tracking daily to stay motivated and identify which stages need more attention.
        </TipBox>
      </div>
    ),
  },
  {
    id: 'trackup-dashboard',
    title: 'Team Tracking Dashboard (Team View)',
    icon: LayoutDashboard,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          View your team's tracking data and analytics in one place. The Team Tracking Dashboard is available on the website for a full-screen experience.
        </p>
        
        <h4 className="font-medium text-sm">What is Team Tracking Dashboard?</h4>
        <p className="text-sm text-muted-foreground">
          Team Tracking Dashboard shows your team's combined tracking data including leads, responses, and funnel stages. Leaders can see their entire team's progress at a glance.
        </p>
        <FeatureHighlight features={[
          { icon: Users, label: 'Team View' },
          { icon: BarChart3, label: 'Analytics' },
          { icon: ExternalLink, label: 'Website' },
        ]} />

        <h4 className="font-medium text-sm">How to Access</h4>
        <StepList
          steps={[
            'Go to Profile tab',
            'Find "Team Tracking Dashboard" button',
            'Tap to open the dashboard in your browser',
            'You\'ll be automatically logged in',
          ]}
        />

        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 my-3">
          <p className="text-sm text-muted-foreground mb-2">
            <strong>Access Team Tracking Dashboard on website:</strong>
          </p>
          <ExternalLinkButton href="https://nevorai.com/trackup">
            Open Team Tracking Dashboard
          </ExternalLinkButton>
        </div>

        <TipBox>
          Use Team Tracking Dashboard for team meetings and reviews - it provides a comprehensive view of everyone's progress!
        </TipBox>
      </div>
    ),
  },
  {
    id: 'activity-tab',
    title: 'Activity Tab (Home)',
    icon: Calendar,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          The Activity tab shows your daily timeline of lead activities and status changes.
        </p>
        <FeatureHighlight features={[
          { icon: Calendar, label: 'Calendar Strip' },
          { icon: Clock, label: 'Timeline' },
          { icon: Eye, label: 'Activity Log' },
        ]} />
        
        <h4 className="font-medium text-sm">Calendar Strip</h4>
        <p className="text-sm text-muted-foreground">
          Swipe through dates to see activities for specific days. Tap on a date to jump to that day's activities.
        </p>

        <h4 className="font-medium text-sm">Activity Timeline</h4>
        <StepList
          steps={[
            'See all lead updates in chronological order',
            'Tap on any activity to view the lead details',
            'Different icons show different activity types',
            'Pull down to refresh for latest updates',
          ]}
        />
      </div>
    ),
  },
  {
    id: 'todo-tab',
    title: 'TodoUp Tab',
    icon: CheckSquare,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Manage your daily tasks and stay organized with the built-in to-do system.
        </p>
        <FeatureHighlight features={[
          { icon: Plus, label: 'Add Task' },
          { icon: CheckSquare, label: 'Check Off' },
          { icon: Calendar, label: 'Due Dates' },
        ]} />
        
        <h4 className="font-medium text-sm">Adding Tasks</h4>
        <StepList
          steps={[
            'Tap the + button to add a new task',
            'Enter your task description',
            'Set a due date if needed',
            'Check off tasks as you complete them',
          ]}
        />

        <h4 className="font-medium text-sm">Daily vs One-Time Tasks</h4>
        <p className="text-sm text-muted-foreground">
          Create recurring daily tasks for habits, or one-time tasks for specific goals. Daily tasks reset each day so you can track consistency.
        </p>
      </div>
    ),
  },
  {
    id: 'tags-tracking',
    title: 'Tags & Tracking Format',
    icon: Tags,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Understanding tags is key to getting the most out of the app.
        </p>
        <FeatureHighlight features={[
          { icon: Tags, label: 'Leads Tags' },
          { icon: Zap, label: 'Funnel Tag' },
          { icon: Target, label: 'Stage Tags' },
        ]} />
        
        <h4 className="font-medium text-sm">Tracking Tags (Leader's Tags)</h4>
        <p className="text-sm text-muted-foreground">
          These are the main tags that appear in your Tracking analytics. If you're connected to an upline leader, you'll use their tracking tags for team-wide consistency.
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
          <li><strong>Leads Tags:</strong> Response statuses like "Not picked", "Video send", "Enrolment"</li>
          <li><strong>Funnel Tag:</strong> One special tag (marked with ⚡) that moves leads to the Funnel tab</li>
          <li><strong>Stage Tags:</strong> Funnel stages like "Day1", "Day2", "Day3"</li>
        </ul>
        <FeatureHighlight features={[
          { icon: Plus, label: 'Add Tag' },
          { icon: Settings2, label: 'Edit' },
          { icon: Trash2, label: 'Delete' },
        ]} />

        <h4 className="font-medium text-sm">Personal Tags (Your Own)</h4>
        <p className="text-sm text-muted-foreground">
          Add your own custom tags for personal organization. These are only visible to you and don't appear in team analytics.
        </p>

        <h4 className="font-medium text-sm flex items-center gap-2">
          <Filter className="h-4 w-4" /> Managing Your Tags
        </h4>
        <StepList
          steps={[
            'Go to Profile → Tracking Format Settings',
            'Tap on "Manage Response Tags" or "Manage Stage Tags"',
            'Add new tags, edit existing ones, or delete tags',
            'Set which tag is the "Funnel Tag" and "Final Target"',
          ]}
        />
        
        <TipBox>
          When you connect to an upline leader, their tracking tags will replace your defaults. You can still add personal tags alongside the team tags!
        </TipBox>
      </div>
    ),
  },
  {
    id: 'upline-connection',
    title: 'Upline Connection',
    icon: Users,
    content: (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Connect with your upline leader to sync tracking tags and join their team analytics.
        </p>
        
        <h4 className="font-medium text-sm">What is an Upline?</h4>
        <p className="text-sm text-muted-foreground">
          Your upline is your team leader or mentor. When connected, you'll share the same tracking tags, making team reporting consistent.
        </p>
        <FeatureHighlight features={[
          { icon: Users, label: 'Team Leader' },
          { icon: Link, label: 'Connect' },
        ]} />

        <h4 className="font-medium text-sm">How to Connect</h4>
        <StepList
          steps={[
            'Go to Profile → Tracking Format Settings',
            'Find the "Connect with Upline" option',
            'Enter your upline\'s email address or Leader ID',
            'Submit the connection request',
            'Once approved, their tracking tags sync to your account',
          ]}
        />
        

        <h4 className="font-medium text-sm">What Syncs from Upline</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
          <li>Tracking tags (Leads & Stage tags)</li>
          <li>Team levels configuration</li>
          <li>Tag colors and ordering</li>
        </ul>
        <p className="text-sm text-muted-foreground mt-2">
          Your leads data, personal tags, and settings remain private - only tag formats are shared.
        </p>

        <TipBox>
          After connecting, you can use the Team Tracking Dashboard to view combined team tracking data!
        </TipBox>
      </div>
    ),
  },
  {
    id: 'tips-tricks',
    title: 'Tips & Best Practices',
    icon: Lightbulb,
    content: (
      <div className="space-y-3">
        <h4 className="font-medium text-sm">Daily Follow Up Workflow</h4>
        <StepList
          steps={[
            'Start each day in ListUp to see pending follow-ups',
            'Make calls and update statuses immediately in Follow Up tab',
            'Add notes during/after calls for future reference',
            'Check Tracking tab at end of day to see progress',
          ]}
        />

        <h4 className="font-medium text-sm">Organizing with Sheets</h4>
        <p className="text-sm text-muted-foreground">
          Create different sheets for different lead sources or campaigns. This helps keep your workspace organized and makes filtering easier.
        </p>
        <FeatureHighlight features={[
          { icon: FolderOpen, label: 'Sheets' },
          { icon: Filter, label: 'Filters' },
        ]} />

        <h4 className="font-medium text-sm">Using Filters Effectively</h4>
        <StepList
          steps={[
            'Filter by "Not picked" to see who needs first contact',
            'Filter by "Follow up" tags to manage re-calls',
            'Use date filters to focus on recent leads',
            'Combine tag + date filters for power filtering',
          ]}
        />

        <TipBox>
          Consistency is key! Try to update lead statuses immediately after each call. This keeps your data accurate and analytics meaningful.
        </TipBox>

        <h4 className="font-medium text-sm">Keyboard Shortcuts (Desktop)</h4>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
          <li><kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Ctrl/⌘ + N</kbd> - Add new lead</li>
          <li><kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Ctrl/⌘ + F</kbd> - Focus search</li>
          <li><kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Esc</kbd> - Close dialogs</li>
        </ul>
      </div>
    ),
  },
];

// ============ Main Component ============

export function UserGuideDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button className="w-full rounded-xl px-4 py-2 bg-card border border-border/50 flex items-center justify-between transition-colors hover:bg-muted/50">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">User Guide</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </DrawerTrigger>

      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader className="border-b pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DrawerTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              User Guide
            </DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Learn how to use all app features effectively
          </p>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-2" style={{ maxHeight: 'calc(90vh - 120px)' }}>
          <Accordion type="single" collapsible className="w-full space-y-2 pb-6">
            {GUIDE_SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="border rounded-lg px-4 data-[state=open]:bg-muted/30"
                >
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{section.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-1 max-h-[50vh] overflow-y-auto">
                    {section.content}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      </DrawerContent>
    </Drawer>
  );
}