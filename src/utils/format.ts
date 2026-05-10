export const formatDuration = (milliseconds: number): string => {
	const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;

	if (minutes === 0) {
		return `${seconds}s`;
	}

	return `${minutes}m ${seconds}s`;
};

export const formatDateTime = (isoDate: string): string => {
	const date = new Date(isoDate);

	if (Number.isNaN(date.getTime())) {
		return isoDate;
	}

	return date.toLocaleString();
};
