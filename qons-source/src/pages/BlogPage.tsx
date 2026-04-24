import { ArrowRight, Calendar, Clock, Tag, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  author: string;
  date: string;
  readTime: string;
  featured?: boolean;
}

const blogPosts: BlogPost[] = [
  {
    slug: "ai-scheduling-property-management",
    title: "How AI Is Revolutionizing Property Management Scheduling",
    excerpt:
      "Manual scheduling costs concierge companies 20-30 hours per week. Here's how AI-powered systems are changing the game — matching staff to properties in seconds instead of hours, reducing overtime costs, and eliminating the chaos of emergency coverage.",
    category: "Industry Insights",
    author: "Ernest Owusu",
    date: "April 12, 2026",
    readTime: "6 min read",
    featured: true,
  },
  {
    slug: "scaling-beyond-15-properties",
    title: "Why Property Management Systems Break Down at 15 Properties",
    excerpt:
      "Most concierge companies hit a wall around 10-15 properties. Spreadsheets can't keep up, phone trees collapse, and manual processes create costly errors. We break down the scaling problem and what modern platforms do differently.",
    category: "Operations",
    author: "Ernest Owusu",
    date: "April 5, 2026",
    readTime: "5 min read",
  },
  {
    slug: "hoa-management-technology-2026",
    title: "The State of HOA Management Technology in 2026",
    excerpt:
      "HOA boards are finally getting access to modern tools — from digital voting and violation tracking to reserve fund management and resident portals. Here's what the landscape looks like and where it's heading.",
    category: "HOA Management",
    author: "Ernest Owusu",
    date: "March 28, 2026",
    readTime: "7 min read",
  },
];

export function BlogPage() {
  const [featured, ...rest] = blogPosts;

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero */}
      <section className="relative py-16 md:py-24">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal/5 rounded-full blur-3xl" />
        </div>
        <div className="container text-center">
          <p className="text-sm font-medium text-teal mb-3 tracking-wide uppercase">
            Blog
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Insights & Ideas
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Perspectives on AI, property management, and the future of building
            operations from the QonsApp team.
          </p>
        </div>
      </section>

      {/* Featured Post */}
      <section className="pb-12">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <div className="bg-card rounded-2xl border overflow-hidden">
              <div className="grid md:grid-cols-2">
                {/* Image placeholder */}
                <div className="bg-gradient-to-br from-navy/10 to-teal/10 min-h-[250px] md:min-h-[350px] flex items-center justify-center p-8">
                  <div className="text-center space-y-2">
                    <div className="size-16 mx-auto rounded-xl bg-teal/10 flex items-center justify-center">
                      <Tag className="size-7 text-teal" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Featured Article
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <Badge
                      variant="outline"
                      className="text-teal border-teal/30"
                    >
                      {featured.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {featured.date}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold mb-3 leading-tight">
                    {featured.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {featured.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <div className="flex items-center gap-1.5">
                      <User className="size-3" />
                      {featured.author}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="size-3" />
                      {featured.readTime}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() =>
                      toast("Blog posts are on the way! Check back soon.")
                    }
                  >
                    Read More
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other Posts */}
      <section className="pb-20 md:pb-28">
        <div className="container">
          <div className="max-w-5xl mx-auto">
            <h3 className="text-lg font-semibold mb-6">Recent Posts</h3>
            <div className="grid md:grid-cols-2 gap-6">
              {rest.map(post => (
                <article
                  key={post.slug}
                  className="bg-card rounded-2xl border p-6 md:p-8 group hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Badge variant="secondary" className="text-xs">
                      {post.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {post.date}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-2 group-hover:text-teal transition-colors leading-tight">
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="size-3" />
                        {post.author}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="size-3" />
                        {post.readTime}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        toast("Blog posts are on the way! Check back soon.")
                      }
                    >
                      Read
                      <ArrowRight className="size-3" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Subscribe CTA */}
      <section className="py-16 md:py-24 bg-muted/20 border-t">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center">
            <Calendar className="size-8 text-teal mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
              Stay in the Loop
            </h2>
            <p className="text-muted-foreground mb-6">
              Get the latest insights on AI, property management, and building
              operations delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 h-11 rounded-md border bg-background px-4 text-sm"
              />
              <Button
                className="h-11 bg-teal text-white hover:bg-teal-dark"
                onClick={() =>
                  toast(
                    "Thanks for your interest! Newsletter signup will be available soon.",
                  )
                }
              >
                Subscribe
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
