"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Home() {
  const router = useRouter();
  const handleStartNowClick = () => {
    router.push("/login"); // Implement email sign-in logic here
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black">
        <div className="flex flex-col items-center gap-6 text-center sm:text-center">
          <h1 className="w-full text-center text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Talk to strangers with AI powered anonymous chat rooms.
          </h1>
          <p className="w-full text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Looking for a fun and engaging way to connect with new people? Our
            AI-powered anonymous chat rooms are the perfect solution! Whether
            you&apos;re seeking stimulating conversations or just want to pass
            the time, our platform offers a safe and exciting environment to
            meet strangers from around the world.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Button onClick={() => handleStartNowClick()}>Start Now</Button>
        </div>
      </main>
    </div>
  );
}
