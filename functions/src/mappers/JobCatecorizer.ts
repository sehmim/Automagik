export type MappedJobObjects = {
  id: string;
  threadId: string;
  company: string;
  position: string;
  date: string;
  status: 'Applied' | 'Rejected' | 'Interview' | 'Ghosted' | 'Uncategorized';
  description: string;
};

export default class JobCatecorizer {
  static toJobObjects(data: any[]): MappedJobObjects[] {
    return data.map(({ threadId, from, subject, date, snippet  }, index) => ({
      id: (index + 1).toString(),
      threadId: threadId,
      company: JobCatecorizer.extractCompany(from),
      position: JobCatecorizer.extractPosition(subject),
      date: JobCatecorizer.formatDate(date),
      status: JobCatecorizer.extractStatus(subject, snippet),
      description: snippet,
    }));
  }

  private static extractCompany(from: string): string {
    // Extracts the company name from the "from" field
    const match = from.match(/"(.*?)"/);
    if (match && match[1]) return match[1];
    return from.split('<')[0].trim();
  }

  private static extractPosition(subject: string): string {
    // Extracts the position title from the subject field
    const match = subject.match(/(?:Application for|Application received for|Confirmation of application received for|Position:|Role:)?\s*(.+?)(?:\sat|position|\(|\-|\.)/i);
    if (match && match[1]) return match[1].trim();
    return "Unknown Position";
  }

  private static extractStatus(subject: string, snippet: string): 'Applied' | 'Rejected' | 'Interview' | 'Ghosted' | 'Uncategorized' {
    // Infers the status from the subject or snippet field
    if (/Interview|Technical interview/i.test(subject) || /scheduled for next week/i.test(snippet)) {
      return 'Interview';
    }
    if (/Rejected|Unfortunately/i.test(subject) || /not selected/i.test(snippet)) {
      return 'Rejected';
    }
    if (/Received|Application Confirmation/i.test(subject)) {
      return 'Applied';
    }
    if (/no response/i.test(snippet) || /followed up/i.test(snippet)) {
      return 'Ghosted';
    }
    return 'Uncategorized'; 
  }

  private static formatDate(date: string): string {
    // Converts the date to YYYY-MM-DD format
    const parsedDate = new Date(date);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }
    return "Invalid Date";
  }
}
