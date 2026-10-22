import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteGoal } from "@/app/goals-actions";
import { ConfirmButton } from "@/components/ConfirmButton";
import { BackHeader } from "@/components/forms/BackHeader";
import { getGoals, getProfile } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import { GoalForm } from "./GoalForm";

export default async function GoalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [profile, goals] = await Promise.all([getProfile(supabase, user.id), id === "new" ? Promise.resolve([]) : getGoals(supabase)]);
  const goal = id === "new" ? null : (goals.find((g) => g.id === id) ?? null);
  if (id !== "new" && !goal) notFound();

  return (
    <>
      <BackHeader href="/insights?tab=savings" title={goal ? goal.name : "New goal"} />
      <GoalForm goal={goal} currency={profile.currency} />
      {goal && (
        <div className="mt-4">
          <ConfirmButton action={deleteGoal} id={goal.id} message={`Delete the goal “${goal.name}”?`}>
            <Trash2 size={18} /> Delete goal
          </ConfirmButton>
        </div>
      )}
    </>
  );
}
