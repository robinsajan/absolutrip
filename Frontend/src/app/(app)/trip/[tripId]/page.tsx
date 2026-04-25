import { redirect } from "next/navigation";

export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
    const { tripId } = await params;

    if (!tripId || tripId === "undefined" || tripId === "null") {
        redirect("/trips");
    }

    redirect(`/trip/${tripId}/explore`);
}
