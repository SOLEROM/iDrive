package i.drive.kids.domain.recurrence

import i.drive.kids.domain.model.Event
import i.drive.kids.domain.model.RecurrenceFrequency
import i.drive.kids.domain.model.RecurrenceRule
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.LocalTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.util.concurrent.TimeUnit

class RecurrenceExpanderTest {

    private val zone = ZoneId.of("UTC")

    private fun event(
        start: ZonedDateTime,
        durationMinutes: Long = 60,
        recurring: Boolean = false,
        rule: RecurrenceRule? = null
    ): Event = Event(
        eventId = "e1",
        childId = "c1",
        title = "Piano",
        createdByParentId = "p1",
        startDateTime = start.toInstant().toEpochMilli(),
        endDateTime = start.plusMinutes(durationMinutes).toInstant().toEpochMilli(),
        isRecurring = recurring,
        recurrenceRule = rule
    )

    @Test
    fun `non-recurring event in window returns single occurrence`() {
        val start = ZonedDateTime.of(LocalDate.of(2026, 5, 4), LocalTime.of(16, 0), zone)
        val evt = event(start)
        val windowStart = start.minusDays(1).toInstant().toEpochMilli()
        val windowEnd = start.plusDays(1).toInstant().toEpochMilli()

        val result = RecurrenceExpander.expand(evt, windowStart, windowEnd, zone)

        assertEquals(1, result.size)
        assertEquals(evt.startDateTime, result[0].startDateTime)
    }

    @Test
    fun `non-recurring event outside window returns empty`() {
        val start = ZonedDateTime.of(LocalDate.of(2026, 5, 4), LocalTime.of(16, 0), zone)
        val evt = event(start)
        val windowStart = start.plusDays(10).toInstant().toEpochMilli()
        val windowEnd = start.plusDays(20).toInstant().toEpochMilli()

        val result = RecurrenceExpander.expand(evt, windowStart, windowEnd, zone)

        assertTrue(result.isEmpty())
    }

    @Test
    fun `weekly recurrence with no end date generates occurrences`() {
        val start = ZonedDateTime.of(LocalDate.of(2026, 5, 4), LocalTime.of(16, 0), zone) // Mon
        val rule = RecurrenceRule(
            frequency = RecurrenceFrequency.WEEKLY,
            daysOfWeek = listOf(DayOfWeek.MONDAY),
            intervalWeeks = 1,
            endDate = null
        )
        val evt = event(start, recurring = true, rule = rule)
        val windowStart = start.toInstant().toEpochMilli()
        val windowEnd = start.plusWeeks(4).toInstant().toEpochMilli()

        val result = RecurrenceExpander.expand(evt, windowStart, windowEnd, zone)

        // Occurrences on 4, 11, 18, 25 May (+ possibly 1 Jun, depending on window boundary)
        assertTrue(result.size >= 4)
        assertEquals(start.toInstant().toEpochMilli(), result[0].startDateTime)
    }

    @Test
    fun `weekly recurrence every 2 weeks skips alternate weeks`() {
        val start = ZonedDateTime.of(LocalDate.of(2026, 5, 4), LocalTime.of(16, 0), zone)
        val rule = RecurrenceRule(
            frequency = RecurrenceFrequency.WEEKLY,
            daysOfWeek = listOf(DayOfWeek.MONDAY),
            intervalWeeks = 2
        )
        val evt = event(start, recurring = true, rule = rule)
        val windowStart = start.toInstant().toEpochMilli()
        val windowEnd = start.plusWeeks(7).toInstant().toEpochMilli()

        val result = RecurrenceExpander.expand(evt, windowStart, windowEnd, zone)

        // Week 0, 2, 4, 6 → 4 occurrences within 7-week window
        assertEquals(4, result.size)
        val gap = result[1].startDateTime - result[0].startDateTime
        assertEquals(TimeUnit.DAYS.toMillis(14), gap)
    }

    @Test
    fun `weekly recurrence respects endDate`() {
        val start = ZonedDateTime.of(LocalDate.of(2026, 5, 4), LocalTime.of(16, 0), zone)
        val endDate = start.plusWeeks(3).toInstant().toEpochMilli()
        val rule = RecurrenceRule(
            frequency = RecurrenceFrequency.WEEKLY,
            daysOfWeek = listOf(DayOfWeek.MONDAY),
            intervalWeeks = 1,
            endDate = endDate
        )
        val evt = event(start, recurring = true, rule = rule)
        val windowStart = start.toInstant().toEpochMilli()
        val windowEnd = start.plusWeeks(52).toInstant().toEpochMilli()

        val result = RecurrenceExpander.expand(evt, windowStart, windowEnd, zone)

        assertTrue("got ${result.size}", result.size in 3..4)
        assertTrue(result.last().startDateTime <= endDate)
    }

    @Test
    fun `multiple daysOfWeek produces multiple occurrences per week`() {
        val start = ZonedDateTime.of(LocalDate.of(2026, 5, 4), LocalTime.of(16, 0), zone) // Mon
        val rule = RecurrenceRule(
            frequency = RecurrenceFrequency.WEEKLY,
            daysOfWeek = listOf(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY),
            intervalWeeks = 1
        )
        val evt = event(start, recurring = true, rule = rule)
        val windowStart = start.toInstant().toEpochMilli()
        val windowEnd = start.plusWeeks(2).toInstant().toEpochMilli()

        val result = RecurrenceExpander.expand(evt, windowStart, windowEnd, zone)

        // week 0: Mon, Wed; week 1: Mon, Wed → at least 4
        assertTrue("got ${result.size}", result.size >= 4)
    }

    @Test
    fun `far-future window without endDate is capped`() {
        val start = ZonedDateTime.of(LocalDate.of(2026, 5, 4), LocalTime.of(16, 0), zone)
        val rule = RecurrenceRule(
            frequency = RecurrenceFrequency.WEEKLY,
            daysOfWeek = listOf(DayOfWeek.MONDAY),
            intervalWeeks = 1,
            endDate = null
        )
        val evt = event(start, recurring = true, rule = rule)
        val windowStart = start.toInstant().toEpochMilli()
        val windowEnd = start.plusYears(25).toInstant().toEpochMilli()

        val result = RecurrenceExpander.expand(evt, windowStart, windowEnd, zone)

        // Hard cap is 520 — test we don't explode nor run forever.
        assertTrue("expected safety cap, got ${result.size}", result.size <= 520)
        assertTrue(result.isNotEmpty())
    }
}
