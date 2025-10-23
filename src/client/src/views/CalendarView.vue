<template>
  <v-container fluid>
    <v-row>
      <v-col>
        <v-card>
          <v-card-text>
            <FullCalendar :options="calendarOptions" />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="eventDialog" max-width="500px">
      <v-card>
        <v-card-title>Event Details</v-card-title>
        <v-card-text>
          <pre>{{ selectedEvent }}</pre>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="primary" text @click="eventDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="propositionDialog" max-width="500px">
      <v-card>
        <v-card-title>Propose a Time</v-card-title>
        <v-card-text>
          <v-form @submit.prevent="submitProposition">
            <v-text-field v-model="propositionForm.participants" label="Participants" type="number" min="1"></v-text-field>
            <v-text-field v-model="propositionForm.tracks" label="Tracks" type="number" min="1"></v-text-field>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="primary" text @click="propositionDialog = false">Cancel</v-btn>
              <v-btn color="primary" type="submit">Submit</v-btn>
            </v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useRoute } from 'vue-router';

const route = useRoute();
const rangeSlug = route.params.rangeSlug as string;

const eventDialog = ref(false);
const propositionDialog = ref(false);
const selectedEvent = ref(null);
const propositionForm = ref({
  participants: 1,
  tracks: 1,
  start: null as Date | null,
  end: null as Date | null,
});

const calendarOptions = ref({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay'
  },
  events: [],
  editable: true,
  selectable: true,
  select: handleDateSelect,
  eventClick: handleEventClick,
});

async function fetchEvents() {
  // TODO: replace with actual API call
  console.log(`Fetching events for range: ${rangeSlug}`);
  calendarOptions.value.events = [];
}

function handleDateSelect(selectInfo: any) {
  propositionForm.value.start = selectInfo.start;
  propositionForm.value.end = selectInfo.end;
  propositionDialog.value = true;
}

function handleEventClick(clickInfo: any) {
  selectedEvent.value = clickInfo.event;
  eventDialog.value = true;
}

function submitProposition() {
  console.log('Proposition submitted:', propositionForm.value);
  // TODO: send proposition to the server
  propositionDialog.value = false;
}

onMounted(() => {
  fetchEvents();
});
</script>
