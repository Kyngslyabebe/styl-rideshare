import styles from './StatsCard.module.css';

interface Props {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
}

export default function StatsCard({ label, value, subtext, color }: Props) {
  return (
    <div className={styles.card}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value} style={color ? { color } : undefined}>
        {value}
      </span>
      {subtext && <span className={styles.subtext}>{subtext}</span>}
    </div>
  );
}
