import { getAiringSchedule } from "@/lib/anilist";
import Image from "next/image";
import Link from "next/link";
import { Clock, CalendarDays } from "lucide-react";

export const metadata = { title: "Airing Schedule" };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function SchedulePage() {
  const schedule = await getAiringSchedule();

  // Group by day of week
  const byDay: Record<string, typeof schedule> = {};
  for (const item of schedule) {
    const date = new Date(item.airingAt * 1000);
    const day = DAYS[date.getDay()];
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(item);
  }

  // Reorder starting from today
  const todayIdx = new Date().getDay();
  const orderedDays = [
    ...DAYS.slice(todayIdx),
    ...DAYS.slice(0, todayIdx),
  ].filter((d) => byDay[d]?.length);

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 bg-brand/20 rounded-lg flex items-center justify-center">
          <CalendarDays size={18} className="text-brand" />
        </div>
        <h1 className="font-display text-4xl text-white">SCHEDULE</h1>
      </div>
      <p className="text-gray-500 text-sm mb-8">Airing episodes in the next 7 days</p>

      {orderedDays.length === 0 && (
        <p className="text-gray-500 text-center py-20">No airing schedule available right now.</p>
      )}

      <div className="space-y-10">
        {orderedDays.map((day) => {
          const isToday = DAYS[new Date().getDay()] === day;
          return (
            <section key={day}>
              {/* Day label */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className={`font-display text-2xl ${isToday ? "text-brand" : "text-white"}`}>
                  {day.toUpperCase()}
                  {isToday && (
                    <span className="ml-2 text-xs font-body bg-brand/20 text-brand px-2 py-0.5 rounded-full align-middle">
                      TODAY
                    </span>
                  )}
                </h2>
                <div className="h-px flex-1 bg-white/5" />
              </div>

              {/* Episodes */}
              <div className="grid gap-2">
                {byDay[day].map((item, i) => {
                  const title = item.media.title.english || item.media.title.romaji;
                  const time = new Date(item.airingAt * 1000);
                  const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

                  return (
                    <Link
                      key={i}
                      href={`/anime/${item.media.id}`}
                      className="group flex items-center gap-3 p-3 rounded-xl hover:bg-surface-2 transition-colors"
                    >
                      {/* Time */}
                      <div className="w-16 shrink-0 text-right">
                        <span className="flex items-center justify-end gap-1 text-xs text-gray-500">
                          <Clock size={11} />
                          {timeStr}
                        </span>
                      </div>

                      {/* Accent line */}
                      <div className={`w-0.5 h-10 rounded-full shrink-0 ${isToday ? "bg-brand" : "bg-surface-3"}`} />

                      {/* Cover */}
                      <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 bg-surface-2">
                        <Image
                          src={item.media.coverImage.medium}
                          alt={title}
                          width={40}
                          height={56}
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium line-clamp-1 group-hover:text-brand transition-colors">
                          {title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Episode {item.episode}
                          {item.media.episodes && ` / ${item.media.episodes}`}
                        </p>
                      </div>

                      {/* Format badge */}
                      {item.media.format && (
                        <span className="shrink-0 text-xs bg-surface-2 text-gray-500 px-2 py-0.5 rounded">
                          {item.media.format}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
