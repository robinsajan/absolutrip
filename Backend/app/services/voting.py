from ..models import StayOption


class VotingService:
    @staticmethod
    def get_ranked_options(trip_id):
        options = StayOption.query.filter_by(trip_id=trip_id).all()

        ranked = []
        for option in options:
            votes = list(option.votes)
            total_score = sum(v.score for v in votes)
            vote_count = len(votes)
            avg_score = total_score / vote_count if vote_count > 0 else 0

            ranked.append({
                'option': option.to_dict(),
                'total_score': total_score,
                'vote_count': vote_count,
                'average_score': round(avg_score, 2),
                'voters': [{'user_id': v.user_id, 'user_name': v.user.name, 'score': v.score} for v in votes]
            })

        ranked.sort(key=lambda x: (x['total_score'], x['vote_count']), reverse=True)

        for i, item in enumerate(ranked, 1):
            item['rank'] = i

        return ranked

    @staticmethod
    def get_user_votes(trip_id, user_id):
        options = StayOption.query.filter_by(trip_id=trip_id).all()
        user_votes = {}

        for option in options:
            vote = next((v for v in option.votes if v.user_id == user_id), None)
            if vote:
                user_votes[option.id] = vote.score

        return user_votes
