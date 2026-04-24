import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Crown, Sparkles, Wrench } from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { SignUp } from "@/components/SignUp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "../../convex/_generated/api";

export function SignupPage() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const invitation = useQuery(
    api.invitations.getByToken,
    inviteToken ? { token: inviteToken } : "skip",
  );
  const acceptInvitation = useMutation(api.invitations.acceptInvitation);
  const { isAuthenticated } = useConvexAuth();
  const navigate = useNavigate();

  // If user just signed up with an invite token, accept it
  useEffect(() => {
    if (isAuthenticated && inviteToken && invitation?.isValid) {
      acceptInvitation({ token: inviteToken })
        .then(result => {
          if (result.success) {
            toast.success("Welcome! You've joined the team.");
            navigate("/dashboard");
          }
        })
        .catch(() => {});
    }
  }, [
    isAuthenticated,
    inviteToken,
    invitation?.isValid,
    acceptInvitation,
    navigate,
  ]);

  const isInvite = !!inviteToken && !!invitation;
  const validInvite = invitation?.isValid;

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 right-1/4 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 size-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto size-12 rounded-xl bg-teal flex items-center justify-center mb-4">
            <span className="text-white font-bold text-lg">Q</span>
          </div>

          {isInvite && validInvite ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight">
                You're Invited!
              </h1>
              <p className="text-muted-foreground text-sm">
                {invitation.inviterName
                  ? `${invitation.inviterName} invited you`
                  : "You've been invited"}{" "}
                as a{" "}
                <Badge variant="outline" className="gap-1 ml-1 capitalize">
                  {invitation.role === "manager" ? (
                    <Crown className="size-3 text-amber-500" />
                  ) : (
                    <Wrench className="size-3 text-green-500" />
                  )}
                  {invitation.role}
                </Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                Create your account to get started
              </p>
            </>
          ) : isInvite && !validInvite ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight">
                Invitation Expired
              </h1>
              <p className="text-muted-foreground text-sm">
                This invitation is no longer valid. Ask your manager to send a
                new one, or sign up for a free trial.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold tracking-tight">
                Start Your Free Trial
              </h1>
              <p className="text-muted-foreground text-sm">
                14 days of full access — no credit card required
              </p>
              <Badge
                variant="outline"
                className="gap-1 text-teal border-teal/30 bg-teal/5"
              >
                <Sparkles className="size-3" /> All Features Included
              </Badge>
            </>
          )}
        </div>

        <SignUp />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Button variant="link" className="p-0 h-auto font-medium" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
